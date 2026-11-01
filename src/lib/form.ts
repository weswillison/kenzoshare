// Shared by server actions. Kept out of the "use server" files, which may
// only export actions.

// On Vercel, the production address comes for free; locally it's set in .env.local.
export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;

export const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
