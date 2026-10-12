"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { requireMember } from "@/modules/core/me";
import type { FormState } from "@/modules/core/actions";
import { t } from "@/strings/en";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
const itemUrl = (id: string) => `${siteUrl()}/garage/${id}`;

function refresh(itemId: string) {
  revalidatePath(`/garage/${itemId}`);
  revalidatePath("/garage");
  revalidatePath("/");
}

export async function saveItem(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  if (!me.household_id) return { error: t.garage.needsHousehold };

  const id = text(form, "id");
  const name = text(form, "name");
  const dollars = Number(text(form, "cost").replace(/[$,]/g, ""));
  if (!name || !text(form, "category_id") || !Number.isFinite(dollars) || dollars < 0) {
    return { error: t.errors.required };
  }
  const fields = {
    name,
    category_id: text(form, "category_id"),
    replacement_cost_cents: Math.round(dollars * 100),
    condition: text(form, "condition") || null,
    location: text(form, "location") || null,
    comes_with: text(form, "comes_with") || null,
    notes: text(form, "notes") || null,
    photo_path: text(form, "photo_path") || null,
  };

  const supabase = await createClient();
  const { error } = text(form, "existing")
    ? await supabase.from("garage_items").update(fields).eq("id", id)
    : await supabase.from("garage_items").insert({ ...fields, id, household_id: me.household_id });
  if (error) {
    console.error("saveItem", error.code, error.message);
    return { error: t.errors.generic };
  }
  refresh(id);
  redirect(`/garage/${id}`);
}

export async function requestItem(itemId: string, _: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("garage_request", {
    p_item: itemId,
    p_due_on: text(form, "due_on") || undefined,
  });
  if (error) {
    console.error("requestItem", error.code, error.message);
    return { error: t.errors.generic };
  }

  const { data: item } = await supabase.from("garage_items").select("name, household_id").eq("id", itemId).single();
  if (item) {
    const { data: owners } = await supabase
      .from("profiles")
      .select("email")
      .eq("household_id", item.household_id)
      .eq("status", "active");
    await sendEmail(
      (owners ?? []).map((o) => o.email),
      t.garage.emails.requestSubject(item.name),
      t.garage.emails.requestBody(me.display_name, item.name, itemUrl(itemId)),
    );
  }
  refresh(itemId);
}

export async function handOver(itemId: string, requestId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("garage_hand_over", {
    p_request: requestId,
    p_photo: text(form, "photo_path") || undefined,
  });
  if (error) {
    console.error("handOver", error.code, error.message);
    return { error: t.errors.generic };
  }
  refresh(itemId);
}

export async function closeRequest(itemId: string, requestId: string) {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("garage_close_request", { p_request: requestId });
  if (error) console.error("closeRequest", error.code, error.message);
  refresh(itemId);
}

export async function returnItem(itemId: string, loanId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const supabase = await createClient();
  const { data: next, error } = await supabase.rpc("garage_return", {
    p_loan: loanId,
    p_photo: text(form, "photo_path") || undefined,
  });
  if (error) {
    console.error("returnItem", error.code, error.message);
    return { error: t.errors.generic };
  }

  if (next) {
    const [{ data: person }, { data: item }] = await Promise.all([
      supabase.from("profiles").select("email").eq("id", next).single(),
      supabase.from("garage_items").select("name").eq("id", itemId).single(),
    ]);
    if (person && item) {
      await sendEmail([person.email], t.garage.emails.nextSubject(item.name), t.garage.emails.nextBody(item.name, itemUrl(itemId)));
    }
  }
  refresh(itemId);
}

export async function confirmReturn(itemId: string, loanId: string) {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("garage_confirm_return", { p_loan: loanId });
  if (error) console.error("confirmReturn", error.code, error.message);
  refresh(itemId);
}

export async function handOff(itemId: string, loanId: string, requestId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("garage_hand_off", {
    p_loan: loanId,
    p_request: requestId,
    p_photo: text(form, "photo_path") || undefined,
  });
  if (error) {
    console.error("handOff", error.code, error.message);
    return { error: t.errors.generic };
  }
  refresh(itemId);
}

export async function pauseItem(itemId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireMember();
  const choice = text(form, "for");
  let until: string | null = null;
  if (choice === "week" || choice === "month") {
    const d = new Date();
    if (choice === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    until = d.toISOString();
  } else if (choice === "date") {
    const date = text(form, "until");
    if (!date) return { error: t.errors.required };
    until = new Date(`${date}T23:59:59-05:00`).toISOString();
  }

  const supabase = await createClient();
  const { error } = await supabase.from("garage_items").update({ status: "paused", paused_until: until }).eq("id", itemId);
  if (error) {
    console.error("pauseItem", error.code, error.message);
    return { error: t.errors.generic };
  }
  refresh(itemId);
}

export async function lendAgain(itemId: string) {
  await requireMember();
  const supabase = await createClient();
  await supabase.from("garage_items").update({ status: "available", paused_until: null }).eq("id", itemId);
  refresh(itemId);
}

// "Not yet" on the lend-again prompt: stay paused, with no end date.
export async function keepPaused(itemId: string) {
  await requireMember();
  const supabase = await createClient();
  await supabase.from("garage_items").update({ paused_until: null }).eq("id", itemId);
  refresh(itemId);
}

export async function retireItem(itemId: string) {
  await requireMember();
  const supabase = await createClient();
  await supabase.from("garage_items").update({ status: "retired" }).eq("id", itemId);
  refresh(itemId);
  redirect("/garage/mine");
}
