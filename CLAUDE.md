# KenzoShare

## What this is
kenzoshare.org is a sharing site for a small group of neighbors in Kensington, Philadelphia, piloting on one block. It covers things hard to do or own alone: a garage share of tools and gear, shared grocery runs, and later a car, shared meals, and childcare. The plan is in docs/plan.md. Decisions and open questions are in docs/decisions.md.

## Values (these override technical preferences)
- Ease of use first. A neighbor who rarely uses apps should be able to borrow a drill in under a minute.
- The site is a doorbell, not a living room. It gets people to each other's doors. No feeds, streaks, gamification, engagement metrics, or notifications beyond what's necessary.
- Degrowth over growth. Small, boring, cheap to run, maintainable by one volunteer. Fewer dependencies, fewer features.
- Trust is relational, not computed. Record facts (history, contributions, issues and how they were resolved). Never compute or display a numeric trust score or rank people.
- Privacy by default. Members can see everything stored about them. Issues are visible only to the people involved and stewards.
- No money moves through the site. The site may record what is owed, never process payments.
- Open source. Never commit secrets, real member data, or neighbors' personal info. Seed data is fake.

## Stack
- Next.js (App Router) with TypeScript
- Supabase: Postgres, Auth with email magic links (no passwords), Row Level Security on every table, Storage for item photos
- Tailwind
- Hosting: Vercel free tier and Supabase free tier. Free Supabase projects can pause when idle; plan a lightweight way to keep it awake.
- Mobile first.

## Versions
Build one version at a time. Each version has a spec in docs/versions/. Do not implement a module until asked. Each module lives in its own folder and can be switched on or off in one config file.
- v0 Core: login, households, profiles, invites, activity log, issues, member stats.
- v1 Garage share: items with replacement cost, borrow, return, hand off, who has what.
- v2 Grocery runs: Costco portion claims and Aldi/Lidl shared lists, runs, runner fee, who owes what.
- v3 Car: blocked until insurance is settled.
- v4 Meals: cooking rotation and dietary needs.
- v5 Childcare: sitter requests and hour swaps. Regular shared care blocked until PA licensing is checked.

Order after v2 is flexible.

## Core data model (v0)
Every person is a user with a profile tied to a household. Everything people do goes into an append-only activity log, so history, contributions, and stats come from real events.

- households: name, address (members only), notes
- profiles: one per auth user. display_name, household_id, phone, preferred_contact (text, call, email), languages, bio, role (member or steward), status (active, paused, left), invited_by (profile id), joined_at
- invites: inviter_id, email, token, status (pending, accepted, expired), created_at. The inviter is the new member's voucher.
- activity_events: append-only, never updated or deleted. actor_id, event_type, module (core, garage, groceries, car, meals, childcare), subject_type, subject_id, counterpart_id (nullable), details (jsonb), created_at
- issues: reporter_id, about_profile_id (nullable), module, subject_type, subject_id, kind (late, damaged, lost, no_show, payment, other), description, status (open, resolved), resolution_note, resolved_by, resolved_at
- member_stats: a view computed from activity_events and issues. A member sees their full stats; others see only contribution counts.

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
