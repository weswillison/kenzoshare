Read CLAUDE.md and docs/versions/v0-core.md. We're building v0 only.

Before writing code, give me a plan with:
1. Repo structure, including empty module folders (garage, groceries, car, meals, childcare) and the config file that switches modules on and off.
2. The full v0 schema as SQL, with each table's RLS policies explained in plain English.
3. Which accounts, keys, and environment variables I need, and where they go. Include a .env.example.
4. Questions you need answered, as a short list.

After I approve: scaffold the project, write migrations and fake seed data, build what v0-core.md lists, log actions to activity_events, and write a README section on running locally and deploying to Vercel.

When v0-core.md's "Done when" works, stop, show me, and tag v0.1.0. Don't start v1.
