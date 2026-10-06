# KenzoShare

A sharing site for a small group of neighbors in Kensington, Philadelphia. Pilot on one block. Open source (license TBD).

Status: planning only. No application code or runnable application checks yet.

## Docs

- [AGENTS.md](AGENTS.md): authoritative project context and shared instructions for coding agents
- [docs/plan.md](docs/plan.md): the plan shared with households
- [docs/decisions.md](docs/decisions.md): what's decided and what's still open
- [docs/comps.md](docs/comps.md): existing tools to learn from
- [docs/versions/](docs/versions/): one spec per version
- [docs/prompts/kickoff.md](docs/prompts/kickoff.md): prompt to start v0 with any coding agent

## Contributing with any agent

Wes maintains. Preston contributes. Edit docs directly or open a pull request.

Start your agent in the repository root. Read AGENTS.md, the plan, decisions, and the spec for the requested version. Agents that support [AGENTS.md](https://agents.md/) can discover the shared instructions directly. [CLAUDE.md](CLAUDE.md) contains only an `@AGENTS.md` import for [Claude Code](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools). For any other agent, explicitly ask it to read AGENTS.md if automatic discovery is unavailable; do not duplicate instructions in tool-specific files.

Keep work within the requested issue or version. To begin v0, use the kickoff prompt, review the proposed plan, and approve it before the agent scaffolds the application. Stop after v0. Record durable decisions and new questions in docs/decisions.md so the next contributor can find them without chat history or private memory.

Follow the shared contribution and verification conventions in AGENTS.md, including commit subjects such as `docs: clarify the v0 kickoff`. There are no repository skills to configure today; any future shared collection and necessary discovery adapters should be documented there.

## Verification

For now, run `git diff --check` and review documentation links, consistency, privacy, and scope. No install, dev, test, lint, typecheck, build, migration, or seed command exists yet. When application code is added, document reproducible commands, provide .env.example with placeholders, and run the same verification checks in CI.

## Privacy rule

No neighbors' names, phone numbers, emails, or addresses in this repo. Git keeps history forever, and the repo may go public. Never commit secrets or real member data; seed data must be fake.
