import { mailpitURL, supabaseURL } from "./settings.ts";

// Playwright passes the environment loaded by playwright.config.ts to this process.
// Check services before spending time on a production build.
for (const name of ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) {
  if (!process.env[name] || process.env[name].endsWith("_xxx")) {
    throw new Error(`Set ${name} in .env.local using local keys from 'supabase status'. See README.md.`);
  }
}

for (const [name, url] of [
  ["Supabase", `${supabaseURL}/auth/v1/health`],
  ["Mailpit", `${mailpitURL}/api/v1/messages`],
]) {
  try {
    const response = await fetch(url, {
      headers: name === "Supabase" ? { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } : {},
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch {
    throw new Error(`${name} is unavailable. Run 'supabase start' and 'supabase db reset --local' before testing. See README.md.`);
  }
}
