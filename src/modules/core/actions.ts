"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMe, requireMember } from "./me";
import { t } from "@/strings/en";

export type FormState = { error?: string; ok?: string } | undefined;

// On Vercel, the production address comes for free; locally it's set in .env.local.
const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function sendLoginLink(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email").toLowerCase();
  if (!email.includes("@")) return { error: t.errors.required };

  const supabase = await createClient();
  // The result is ignored on purpose: telling a stranger whether an email
  // belongs to a member would leak who lives on the block.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/` },
  });
  // Non-members are expected to fail here; anything else is a real problem.
  if (error && error.code !== "otp_disabled" && error.code !== "signup_disabled") {
    console.error("sendLoginLink", error.code, error.message);
  }
  return { ok: t.login.sent(email) };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function saveName(_: FormState, form: FormData): Promise<FormState> {
  const me = await getMe();
  if (!me) redirect("/login");
  const name = text(form, "display_name");
  if (!name) return { error: t.errors.required };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", me.id);
  if (error) return { error: t.errors.generic };
  revalidatePath("/welcome");
}

export async function createHousehold(_: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const name = text(form, "name");
  if (!name) return { error: t.errors.required };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", {
    p_name: name,
    p_address: text(form, "address") || undefined,
  });
  if (error) return { error: t.errors.generic };
  redirect("/");
}

export async function askToJoin(householdId: string) {
  await requireMember();
  const supabase = await createClient();
  await supabase.from("household_join_requests").insert({ household_id: householdId });
  revalidatePath("/welcome");
}

export async function decideJoin(requestId: string, approve: boolean) {
  await requireMember();
  const supabase = await createClient();
  await supabase
    .from("household_join_requests")
    .update({ status: approve ? "approved" : "declined" })
    .eq("id", requestId);
  revalidatePath("/");
}

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  const name = text(form, "display_name");
  if (!name) return { error: t.errors.required };
  const contact = text(form, "preferred_contact");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: name,
      phone: text(form, "phone") || null,
      preferred_contact: contact === "text" || contact === "call" || contact === "email" ? contact : null,
      languages: text(form, "languages").split(",").map((l) => l.trim()).filter(Boolean),
      bio: text(form, "bio") || null,
    })
    .eq("id", me.id);
  if (error) return { error: t.errors.generic };
  revalidatePath("/", "layout");
  return { ok: t.saved };
}

export async function saveHousehold(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  if (!me.household_id) return { error: t.errors.generic };
  const name = text(form, "name");
  if (!name) return { error: t.errors.required };

  const supabase = await createClient();
  const { error } = await supabase
    .from("households")
    .update({ name, address: text(form, "address") || null, notes: text(form, "notes") || null })
    .eq("id", me.household_id);
  if (error) return { error: t.errors.generic };
  revalidatePath("/", "layout");
  return { ok: t.saved };
}

export async function sendInvite(_: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const email = text(form, "email").toLowerCase();
  if (!email.includes("@")) return { error: t.errors.required };

  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .ilike("email", email);
  if (count) return { error: t.invite.alreadyMember };

  // The row goes in first so the voucher is on record before the invitee
  // can possibly click the link.
  const { data: invite, error } = await supabase.from("invites").insert({ email }).select("id").single();
  if (error) return { error: error.code === "23505" ? t.invite.alreadyInvited : t.errors.generic };

  const admin = createAdminClient();
  const { error: sendError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl()}/welcome`,
  });
  if (sendError) {
    console.error("sendInvite: send failed", sendError.status, sendError.code, sendError.message);
    const { error: cleanupError } = await admin.from("invites").delete().eq("id", invite.id);
    // If this fails too, the stuck row blocks re-inviting the address until someone deletes it in the Supabase dashboard.
    if (cleanupError) console.error("sendInvite: cleanup failed", cleanupError.code, cleanupError.message);
    return { error: t.invite.failed };
  }
  revalidatePath("/invite");
  return { ok: t.invite.sent(email) };
}

export async function reportIssue(_: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const description = text(form, "description");
  const kind = text(form, "kind");
  if (!description || !(kind in t.issues.kinds)) return { error: t.errors.required };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .insert({ kind, description, about_profile_id: text(form, "about") || null })
    .select("id")
    .single();
  if (error) return { error: t.errors.generic };
  redirect(`/issues/${data.id}`);
}

export async function resolveIssue(_: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const id = text(form, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ status: "resolved", resolution_note: text(form, "resolution_note") || null })
    .eq("id", id);
  if (error) return { error: t.errors.generic };
  revalidatePath(`/issues/${id}`);
}

export async function reopenIssue(id: string) {
  await requireMember();
  const supabase = await createClient();
  await supabase.from("issues").update({ status: "open" }).eq("id", id);
  revalidatePath(`/issues/${id}`);
}
