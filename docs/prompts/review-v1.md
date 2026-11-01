Help me review what's been built in KenzoShare so far: v0 Core (live) and v1 Garage Share (PR #9, branch `v1-garage`). Walk me through it; don't change anything until I ask.

Start by reading AGENTS.md, docs/plan.md, docs/decisions.md, docs/versions/v0-core.md, and docs/versions/v1-garage-share.md. Then:

1. **Orient me.** In a few sentences: what v0 does, what v1 adds, and which decisions in docs/decisions.md changed the v1 spec (household ownership, request then hand-over, the waitlist, the two emails).

2. **Get it running locally.** Check out `v1-garage`. Walk me through `npm install`, `supabase start`, `.env.local` from `.env.example`, `supabase db reset`, and `npm run dev`, following the Verification section of AGENTS.md. If Storage uploads fail with "database error, code: 42P10" after a `db reset`, run `supabase stop --no-backup && supabase start`.

3. **Show me the data model.** Go through `supabase/migrations/` table by table. For each one, explain in plain English who can read and change it, and point to the RLS test in `supabase/tests/` that proves it. Call out:
   - Why "who has it now" is derived from `garage_loans` rather than stored on the item, and how the partial unique index stops two open loans.
   - Why borrow steps are database functions instead of plain inserts.
   - Why grants start from nothing (Supabase's defaults include TRUNCATE, which skips RLS).
   - How photo uploads are limited by path in `can_upload_garage_photo`.

4. **Walk the flows with seed users.** Sign in as people from `supabase/seed.sql`; links land in Mailpit at http://127.0.0.1:54324. Have me try:
   - Dana (in line for the drill) and Tom (who owns it): request, then hand over.
   - Rosa (has the tent) handing it straight to Omar (next in line).
   - A return with someone waiting, and where the "you're next" email shows up locally (the dev server log).
   - Listing an item with a photo from my phone if I can reach the dev server, or a desktop browser otherwise.
   - Pausing an item and the "Lend it again?" prompt.

5. **Review the code with me.** Look for bugs, privacy gaps, and places that drift from the values in AGENTS.md (no scores or rankings, no extra notifications, few dependencies). Run `supabase test db`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`, and report results honestly. Point out anything I should raise with Wes.

6. **Open questions for Wes**, if I agree they matter:
   - Hand-offs only go to the next person in line. Should a borrower be able to hand off to anyone?
   - The item list says "Available" on every row. Show only "Out" and "Paused"?

Before PR #9 merges, two hosted steps are needed (ask Wes before running either):
- `supabase db push` to apply the v1 migration to the hosted project.
- `RESEND_API_KEY` set in Vercel (Wes is creating this key).
