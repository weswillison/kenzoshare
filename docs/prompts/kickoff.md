Read AGENTS.md, docs/plan.md, docs/decisions.md, and docs/versions/v0-core.md. We're building v0 only.

The repository is currently planning only, with no application code or runnable checks. Before writing code or scaffolding, give me a plan with:
1. Repo structure, including empty module folders (garage, groceries, car, meals, childcare) and the config file that switches modules on and off.
2. The full v0 schema as SQL, with each table's RLS policies explained in plain English.
3. Which accounts, keys, and environment variables I need, and where they go. Show the proposed .env.example contents, with placeholders only.
4. Questions you need answered, as a short list. Don't edit any files yet.

After I approve: record my answers and any remaining open questions in docs/decisions.md, scaffold the project, write migrations and fake seed data, build what v0-core.md lists, log actions to activity_events, and write a README section on running locally and deploying to Vercel. Update the "Current state and starting work" and "Verification" sections of AGENTS.md with the real install, development, migration, seeding, and check commands.

When v0-core.md's "Done when" works, stop, show me, and tag v0.1.0. Don't start v1.
