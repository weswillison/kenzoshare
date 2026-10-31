import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// Only for uploading photos straight from the phone to Storage, which keeps
// large files out of server actions. Everything else runs on the server.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
