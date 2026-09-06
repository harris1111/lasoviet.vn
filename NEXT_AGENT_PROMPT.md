# Next Agent Prompt

Continue the `harris1111/lasoviet.vn` project from:

- Worktree: `G:\Dev\Repos-Windows\tuvi-a-lam\lasoviet-admin-operations-plan`
- Branch: `feature/paid-flow-admin-operations`
- Audited implementation baseline:
  `8393f4a3fda31ff6aa50c5ad4390bcc4e5bf9e3c`

Before changing anything:

1. Read `AGENT_HANDOFF.md`.
2. Read `AGENTS.md` and `README.md`.
3. Read the master plan, decision tracker, P04-T03 phase section, and matching
   task contract.
4. Fetch `origin`, verify the actual branch/HEAD/worktree state, and report any
   drift from the handoff.
5. Summarize the exact files, behavior, checks, and exclusions for P04-T03.

Use Superpowers only; never invoke `/ck` or CK CLI. Communicate with the founder
in Vietnamese. Keep repository documents and commit messages in English.

Agent roles:

- Sol xhigh orchestrates and reviews meaningful milestones.
- Terra medium implements, debugs, and runs focused checks.
- Global Flash Executor high (`ag/gemini-3.8-flash-high`) may execute only an
  exact bounded Sol/Terra brief. It must not plan, propose, infer scope, or debug
  deeply.
- Luna remains paused.

Primary task: implement **P04-T03 report worker and report state machine** so the
existing `report.generation.requested.v1` path has a durable consumer. Do not
expand into P04-T04 knowledge retrieval, full P04-T05 AI generation, P04-T06
HTML persistence, deployment, production payment activation, or production AI
activation.

Do not push to `master`. Do not create a PR, merge, deploy, expose credentials,
or trigger external side effects unless the founder explicitly requests that
operation.
