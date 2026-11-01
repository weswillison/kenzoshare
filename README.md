# KenzoShare

A sharing site for a small group of neighbors in Kensington, Philadelphia. Pilot on one block. Open source under AGPL-3.0 (see `LICENSE`).

Status: v0 (logins, people, households, invites, problems) and v1 Garage Share (items, borrowing, waitlists, hand-offs) are live for testing with the first two households.

## Docs

- [AGENTS.md](AGENTS.md): authoritative project context and shared instructions for coding agents
- [docs/plan.md](docs/plan.md): the plan shared with households
- [docs/decisions.md](docs/decisions.md): what's decided and what's still open
- [docs/comps.md](docs/comps.md): existing tools to learn from
- [docs/versions/](docs/versions/): one spec per version
- [docs/prompts/kickoff.md](docs/prompts/kickoff.md): prompt to start v0 with any coding agent
- [docs/prompts/review-v1.md](docs/prompts/review-v1.md): prompt to walk a reviewer through v0 and v1

## Contributing with any agent

Wes maintains. Preston contributes. Edit docs directly or open a pull request.

Start your agent in the repository root. Read AGENTS.md, the plan, decisions, and the spec for the requested version. Agents that support [AGENTS.md](https://agents.md/) can discover the shared instructions directly. [CLAUDE.md](CLAUDE.md) contains only an `@AGENTS.md` import for [Claude Code](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools). For any other agent, explicitly ask it to read AGENTS.md if automatic discovery is unavailable; do not duplicate instructions in tool-specific files.

Keep work within the requested issue or version. To begin v0, use the kickoff prompt, review the proposed plan, and approve it before the agent scaffolds the application. Stop after v0. Record durable decisions and new questions in docs/decisions.md so the next contributor can find them without chat history or private memory.

Follow the shared contribution and verification conventions in AGENTS.md, including commit subjects such as `docs: clarify the v0 kickoff`. There are no repository skills to configure today; any future shared collection and necessary discovery adapters should be documented there.

## Verification

See the Verification section of [AGENTS.md](AGENTS.md) for the current checks.

## Running locally

Needs Node 22, Docker (or Colima), and the [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
npm install
supabase start
cp .env.example .env.local    # fill in keys from `supabase status`
npm run dev
```

Open http://localhost:3000 and sign in with any email from `supabase/seed.sql`, such as `sam@example.test` (a steward). The sign-in link arrives in Mailpit at http://127.0.0.1:54324.

## Deploying

Runs on a free Supabase project and a free Vercel project. Email goes through Resend's free plan from `mail.kenzoshare.org`.

1. Supabase: create the project, run `supabase link` and `supabase db push`, turn off public signups, paste `supabase/templates/*.html` into the email templates, set custom SMTP (Supabase's built-in email only reaches your own team), and set the site URL to https://kenzoshare.org.
2. Vercel: import the repo and set the variables from `.env.example`. Copy the Supabase secret key (it starts with `sb_secret_`) from the dashboard under Project Settings → API Keys; the CLI's `projects api-keys` output didn't work as a secret key. `vercel.json` schedules a daily ping so the free database doesn't pause.
3. Garage Share emails need `RESEND_API_KEY` in Vercel: a Resend key with sending access only.
4. Make the first stewards by setting `role = 'steward'` on their profiles in the Supabase dashboard.

## Privacy rule

No neighbors' names, phone numbers, emails, or addresses in this repo. Git keeps history forever, and the repo may go public. Never commit secrets or real member data; seed data must be fake.
