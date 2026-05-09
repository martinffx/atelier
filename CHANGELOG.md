# Changelog

## [0.1.0] - 2026-05-08

### Added

- CLI installer (`bunx @martinffx/atelier@latest`) with `init`, `update`, `remove` commands
- Claude Code generator: `.claude/settings.json` with model + hooks, `.claude/agents/*.md`
- OpenCode generator: `opencode.json` with primary agents, `.opencode/agents/*.md` subagents
- Harness auto-detection (CLAUDE_PLUGIN_ROOT env var, .opencode/ directory)
- Model registry with per-agent defaults for both harnesses
- Agent template fetching from GitHub, injected with harness-specific model
- Skills bundled in npm package, installed via `--all` flag
- 34 universal skills across spec-, oracle-, code-, typescript-, and python- namespaces
- Claude Code atelier plugin marketplace
- Spec-driven development workflow skills (research, plan, implement, finish, subagents)
- Dedicated /spec:init command with guided setup
- Structured workflows with parallel execution and validation
- Deep thinking agents (oracle, architect, clerk)
- Python ecosystem patterns plugin
- TypeScript ecosystem patterns (Effect-TS, Drizzle ORM, DynamoDB Toolbox, Fastify, testing)
- Git workflow skills (worktrees, Graphite stacked commits, branch completion)
- Code review skill with agent dispatch and gfreview integration
- Conventional commit skill
- Beads task tracker CLI reference
- SessionStart hook to load spec:orchestrator

### Changed

- Agent templates (`agents/*.md`) now harness-agnostic — `model` field injected by CLI
- Methodology updated with superpowers integration, hard gates, verification, and domain boundary testing

### Fixed

- Various skill name consistency fixes
- Marketplace schema format corrected for Claude Code validation

[0.1.0]: https://github.com/martinffx/atelier/releases/tag/v0.1.0
