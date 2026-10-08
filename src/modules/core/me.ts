import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// cache() dedupes within one request, so a page and its components can all
// ask "who am I?" without repeating the query.
export const getMe = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return profile;
});

export async function requireMember() {
  const me = await getMe();
  if (!me) redirect("/login");
  if (me.status === "left") redirect("/left");
  if (!me.display_name) redirect("/welcome");
  return me;
}
