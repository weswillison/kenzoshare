import { createAdminClient } from "@/lib/supabase/admin";

// Free Supabase projects pause after a week without activity. A Vercel cron
// calls this daily; Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { error } = await createAdminClient().from("households").select("id").limit(1);
  return new Response(error ? "Database error" : "ok", { status: error ? 500 : 200 });
}
