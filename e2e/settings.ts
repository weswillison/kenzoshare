import { existsSync } from "node:fs";

// Node 22 loads the app's local setup without another dotenv dependency.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

function localURL(name: string, fallback: string) {
  const url = new URL(process.env[name] || fallback);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be a local HTTP origin. Browser tests must never target a hosted project.`);
  }
  return url.origin;
}

// Defaults match supabase/config.toml. Overrides support isolated local stacks.
export const baseURL = localURL("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
export const supabaseURL = localURL("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
export const mailpitURL = localURL("E2E_MAILPIT_URL", "http://127.0.0.1:54324");

export const people = {
  sam: { id: "00000000-0000-4000-8000-000000000001", email: "sam@example.test" },
  rosa: { id: "00000000-0000-4000-8000-000000000002", email: "rosa@example.test" },
  marcus: { id: "00000000-0000-4000-8000-000000000003", email: "marcus@example.test" },
  linh: { id: "00000000-0000-4000-8000-000000000004", email: "linh@example.test" },
  ade: { id: "00000000-0000-4000-8000-000000000005", email: "ade@example.test" },
  tom: { id: "00000000-0000-4000-8000-000000000007", email: "tom@example.test" },
};

export const blueDoor = "10000000-0000-4000-8000-000000000001";
