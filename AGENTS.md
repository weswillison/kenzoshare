# KenzoShare

## What this is
kenzoshare.org is a sharing site for a small group of neighbors in Kensington, Philadelphia, piloting on one block. It covers things hard to do or own alone: Garage Share (tools and gear), Grocery Share (shared grocery runs), and later a car, shared meals, and childcare. The plan is in [docs/plan.md](docs/plan.md). Decisions and open questions are in [docs/decisions.md](docs/decisions.md).

## Current state and starting work
This repository is planning only: no application code, dependency manifest, migrations, seed script, or CI exists yet. The stack and data model below describe the planned application. Update this section and Verification when that changes.

- Read this file, [docs/plan.md](docs/plan.md), [docs/decisions.md](docs/decisions.md), and the relevant version spec before making changes.
- Work only on the requested issue or version. Documentation work does not authorize scaffolding or feature implementation.
- Before implementing any version, present the structure, SQL and RLS plan, accounts and environment variables, and open questions, and wait for approval before scaffolding or writing migrations. Stop when that version is done; do not start the next one.
- For v0, use [docs/prompts/kickoff.md](docs/prompts/kickoff.md) and [docs/versions/v0-core.md](docs/versions/v0-core.md).
- Record durable product decisions and open questions in docs/decisions.md. Do not rely on private agent memory or previous chats to carry project decisions.

## Values (these override technical preferences)
- Ease of use first. A neighbor who rarely uses apps should be able to borrow a drill in under a minute.
- The site is a doorbell, not a living room. It gets people to each other's doors. No feeds, streaks, gamification, engagement metrics, or notifications beyond what's necessary.
- Degrowth over growth. Small, boring, cheap to run, maintainable by one volunteer. Fewer dependencies, fewer features.
- Trust is relational, not computed. Record facts (history, contributions, issues and how they were resolved). Never compute or display a numeric trust score or rank people.
- Privacy by default. Members can see everything stored about them. Issues are visible only to the people involved and stewards.
- No money moves through the site. The site may record what is owed, never process payments.
- Open source. Never commit secrets, real member data, or neighbors' personal info. Seed data is fake.

## Planned stack
- Next.js (App Router) with TypeScript
- Supabase: Postgres, Auth with email magic links (no passwords), Row Level Security on every table, Storage for item photos
- Tailwind
- Hosting: Vercel free tier and Supabase free tier. Free Supabase projects can pause when idle; plan a lightweight way to keep it awake.
- Mobile first.

## Versions
Build one version at a time. Each version has a spec in [docs/versions/](docs/versions/). Do not implement a module until asked. Each module lives in its own folder and can be switched on or off in one config file.
- v0 Core: login, households, profiles, invites, activity log, issues, member stats.
- v1 Garage Share: items with replacement cost, borrow, return, hand off, who has what.
- v2 Grocery Share: Costco portion claims and Aldi/Lidl shared lists, runs, runner fee, who owes what.
- v3 Car: blocked until insurance is settled.
- v4 Meals: cooking rotation and dietary needs.
- v5 Childcare: sitter requests and hour swaps. Regular shared care blocked until PA licensing is checked.

Order after v2 is flexible.

## Core data model (v0)
Every person is a user with a profile tied to a household. Everything people do goes into an append-only activity log, so history, usage, and stats come from real events.

- households: name, address (members only), notes
- profiles: one per auth user. display_name, household_id, phone, preferred_contact (text, call, email), languages, bio, role (member or steward), email (copied from auth for the directory), status (active, left), invited_by (profile id), joined_at
- household_join_requests: profile_id, household_id, status (pending, approved, declined), decided_by, created_at, decided_at. Any current member of the household approves or declines.
- invites: inviter_id, email, status (pending, accepted, expired), created_at. Supabase's invite email carries the sign-in token. The inviter is the new member's voucher.
- activity_events: append-only, never updated or deleted. actor_id, event_type, module (core, garage, groceries, car, meals, childcare), subject_type, subject_id, counterpart_id (nullable), details (jsonb), created_at
- issues: reporter_id, about_profile_id (nullable), module, subject_type, subject_id, kind (late, damaged, lost, no_show, payment, other), description, status (open, resolved), resolution_note, resolved_by, resolved_at
- member stats: computed from activity_events and issues. A member sees their full stats. Others see plain facts from a person's history on their profile ("Lent 3 things"), never a score, and never in lists.

Future modules add their own tables and write to the same activity_events and issues tables, so each person has one history across everything.

## Conventions
- Server components and server actions before API routes or state libraries.
- Every table gets RLS policies plus a test proving a member can't read or edit what they shouldn't.
- Schema changes only through migrations in supabase/migrations.
- Seed script with 8 fake households, about 12 fake people.
- Warm, plain UI language. All UI strings in one place so translation is easy later.
- Small commits. Tag releases (v0.1.0, v1.0.0).
- Ask before adding a dependency.
- When unsure about a product decision, check docs/decisions.md, then ask.

## Shared contribution workflow
- Keep changes focused and commits small. Use commit subjects in the form `type: short imperative description`, with `docs`, `feat`, `fix`, `chore`, or `test` as the type. Example: `docs: share project instructions across agents`.
- In a pull request or handoff, explain what changed and why, which checks ran, and any limitations or unresolved questions. Do not claim checks passed if they were unavailable or not run.
- Keep shared instructions here. Tool-specific entry points should reference this file rather than copy it; CLAUDE.md imports it for Claude Code.
- There are no repository skills today. If skills are added, maintain one shared collection, document its source and compatibility limitations, and add discovery adapters only for the agents contributors actually use.

## Verification
There are no runnable application tests, lint, typecheck, build, development, migration, or seeding commands yet. For documentation changes:

- Run `git diff --check`.
- Review the diff for preserved product values, privacy rules, approval boundaries, and scope. Check that local document links resolve and instructions match the actual repository state.
- When changing agent entry points, check a fresh session in Claude Code and another coding agent. Ask each to identify scope, privacy rules, approval boundaries, and available checks from repository files alone; report agent versions, results, and limitations in the pull request or handoff. If a second agent isn't available, say that this check was not run.

When application code is added, document reproducible installation, development, migration, seeding, and verification commands, add .env.example with placeholders only, and run the same verification checks in CI. Keep commands current in shared documentation.
