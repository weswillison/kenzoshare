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

Run all tests, or a single suite:

```bash
npm run test         # unit, database, then browser tests; stops on failure
npm run test:unit    # container-runtime selection regression tests
npm run test:db      # SQL/RLS tests against the running local Supabase stack
npm run test:e2e     # browser flows against local Supabase and Mailpit
```

`test:db` loads `.env.local` and runs this checkout's SQL/RLS tests through the Supabase CLI, which must be on your `PATH`. On Linux it prefers Docker when its API responds, otherwise it detects a responding rootless Podman socket. An explicit `DOCKER_HOST` in your shell or `.env.local` takes precedence. If neither API responds, Supabase reports its normal connection error. Start the stack and apply migrations and seed data before testing; the npm commands do not reset the database. Browser setup is described below.

For a separate stack, put `SUPABASE_WORKDIR=/path/to/stack` alongside that stack's browser URLs and keys in `.env.local`. Both `npm run test` and `npm run test:db` then use that configuration without extra shell exports. You can also forward CLI flags: `npm run test:db -- --workdir /path/to/stack`. The database tests use `SUPABASE_WORKDIR` or the repository's Supabase config; the browser tests use the URLs and keys, so keep them pointed at the same stack.

## Running locally

Needs Node 22, a Docker-compatible container runtime (Docker, Podman, or Colima), and the [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
npm install
supabase start
cp .env.example .env.local    # fill in keys from `supabase status`
npm run dev
```

Open http://localhost:3000 and sign in with any email from `supabase/seed.sql`, such as `sam@example.test` (a steward). The sign-in link arrives in Mailpit at http://127.0.0.1:54324.

### Podman on Linux

With rootless Podman installed, start its Docker-compatible API socket and point the Supabase CLI at it:

```bash
systemctl --user start podman.socket
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"
supabase start
```

Direct Supabase commands, such as starts and resets, need `DOCKER_HOST` set in their terminal. The npm database-test command detects a responding rootless Podman socket automatically when Docker is unavailable, including when its socket exists but is inaccessible. These commands use the regular Supabase runtime, which supports the custom email templates used by this app. The experimental native runtime currently rejects those templates. No Docker daemon or experimental Supabase settings are needed. See the [Podman API service documentation](https://docs.podman.io/en/latest/markdown/podman-system-service.1.html).

## Browser tests

The small Playwright suite in [e2e/core.spec.ts](e2e/core.spec.ts) covers the v0 happy paths at phone width in Chromium: emailed sign-in and sign-out, profile edits and the directory, invite acceptance and creating a household, joining an existing household with approval, and reporting and resolving a private problem. It also checks that an unrelated member cannot open that problem. Garage Share coverage belongs with v1, which is not on this branch yet.

Use Node 22 and the disposable local Supabase stack, with the local keys from `supabase status` in `.env.local` as described above. With Podman, set `DOCKER_HOST` as shown above when running direct Supabase commands. No hosted accounts are needed.

```bash
npm ci
npx playwright install chromium     # once, and after Playwright upgrades
supabase start
supabase db reset --local           # deletes local data and restores the fake seed
npm run test:e2e
```

Stop any app running on the test port first. By default, Playwright builds and starts its own production server at `NEXT_PUBLIC_SITE_URL` (default http://localhost:3000), then stops it when finished. The build needs network access to download the app's Google font. Supabase and Mailpit stay running. The configuration reads `.env.local` and accepts only local HTTP URLs; use only local keys. On Linux, Playwright may ask you to install browser system dependencies with `npx playwright install-deps chromium`.

For a separate local stack, use its API URL and keys in `.env.local`, set `NEXT_PUBLIC_SITE_URL` to match that stack's Auth site URL, and set `E2E_MAILPIT_URL` to its mail service URL (default http://127.0.0.1:54324). Each stack needs a unique `project_id` and ports in its Supabase config. Reset only the disposable stack whose config you are using; `supabase --workdir /path/to/stack ...` selects a separate config directory. If Node is managed by mise, `mise exec node@22 -- npm run test:e2e` runs the suite with the required Node version.

Tests use real email links captured by Mailpit, separate browser sessions for neighbors, and real database writes. They do not mock Supabase, bypass login, or clear the inbox. New invitees have unique `@example.test` emails, and the email helper ignores messages that existed before each request. Each flow signs in a different seed member to avoid per-user email cooldowns, and one worker keeps shared seed data predictable. Reruns work without resetting, but they leave fake invites, households, issues, history, and edits to Rosa's profile behind. Reset again for a clean baseline. If you hit local Auth rate limits after repeated runs, wait for their window to expire.

```bash
npm run test:e2e -- --list          # discover tests without starting services
npm run test:e2e -- --headed        # watch the phone-sized browser
npm run test:e2e -- -g "reports"    # run just the problem flow
npx playwright show-report
```

Every run builds the app first. To iterate on a test without rebuilding, start the app yourself with the same local `.env.local` (`npm run build && npm run start`, or `npm run dev`) and run `E2E_REUSE_SERVER=1 npm run test:e2e -- -g "reports"`. Playwright then uses the app already on the test port and skips its setup check, so make sure Supabase and Mailpit are running.

Failures retain traces and screenshots in the ignored `test-results/` directory; the HTML report is in `playwright-report/`. Selectors use form field names and link paths, plus explicit test IDs for household join actions and signing out. UI wording and styling can change without rewriting those selectors.

Keep detailed permission and data-rule coverage in `supabase/tests/`; these browser tests are a few checks that the main pieces work together. Add focused unit tests when substantial pure logic appears (for example, grocery cost calculations), rather than adding component snapshots or another test framework now. CI is still pending; when added, run the existing verification checks and this suite against a fresh local Supabase stack.

## Deploying

Runs on a free Supabase project and a free Vercel project. Email goes through Resend's free plan from `mail.kenzoshare.org`.

1. Supabase: create the project, run `supabase link` and `supabase db push`, turn off public signups, paste `supabase/templates/*.html` into the email templates, set custom SMTP (Supabase's built-in email only reaches your own team), and set the site URL to https://kenzoshare.org.
2. Vercel: import the repo and set the variables from `.env.example`. `vercel.json` schedules a daily ping so the free database doesn't pause.
3. Garage Share emails need `RESEND_API_KEY` in Vercel: a Resend key with sending access only.
4. Make the first stewards by setting `role = 'steward'` on their profiles in the Supabase dashboard.

## Privacy rule

No neighbors' names, phone numbers, emails, or addresses in this repo. Git keeps history forever, and the repo may go public. Never commit secrets or real member data; seed data must be fake.
