// Playwright passes the environment loaded by playwright.config.ts to this process,
// including the local URLs that e2e/settings.ts checked. Plain JavaScript keeps
// this check free of TypeScript loading. Check services before a production build.
const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const mailpitURL = process.env.E2E_MAILPIT_URL;
for (const name of ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) {
  if (!process.env[name] || process.env[name].endsWith("_xxx")) {
    throw new Error(`Set ${name} in .env.local using local keys from 'supabase status'. See README.md.`);
  }
}

// The local API accepts any publishable key, but invites need a valid secret key.
const secret = process.env.SUPABASE_SECRET_KEY;
for (const [name, url, headers] of [
  ["Supabase", `${supabaseURL}/auth/v1/admin/users?per_page=1`, { apikey: secret, Authorization: `Bearer ${secret}` }],
  ["Mailpit", `${mailpitURL}/api/v1/messages`, {}],
]) {
  let response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(5_000) });
  } catch (error) {
    throw new Error(`${name} is unavailable at ${url} (${error.cause?.code ?? error.message}). Run 'supabase start' and 'supabase db reset --local' before testing. See README.md.`);
  }
  if (name === "Supabase" && [401, 403].includes(response.status)) {
    throw new Error(`Supabase rejected SUPABASE_SECRET_KEY (HTTP ${response.status}). Copy the current local keys from 'supabase status' into .env.local. See README.md.`);
  }
  if (!response.ok) throw new Error(`${name} answered HTTP ${response.status} at ${url}. Check 'supabase status'. See README.md.`);
}
