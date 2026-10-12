import "server-only";
import { createClient } from "@/lib/supabase/server";

export const thumbPath = (path: string) => path.replace(/\.jpg$/, "-thumb.jpg");

// The bucket is private, so photos are shown through short-lived signed
// links. One request signs every photo on the page.
export async function signPhotos(paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("garage-photos").createSignedUrls(unique, 60 * 60);
  return new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]));
}
