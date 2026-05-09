# Atelier CLI Installer

## Problem

Atelier provides 34 skills and 3 agent personas for spec-driven development, but setup is manual and harness-specific. Users must:
- Install skills via `npx skills add`
- Copy agent files to harness-specific locations
- Configure session-start hooks per harness
- Manage model mappings manually

This friction prevents adoption and creates maintenance hell when skills update or agents change.

## Scope

**In scope:**
- CLI installer (`bunx atelier@latest`) — built with TypeScript + Bun, may have dependencies (commander, inquirer)
- Zero-dependency output (user's project gets only `.atelier/config.json` + generated files)
- Harness auto-detection (Claude Code, OpenCode)
- Skills installation via `npx skills` wrapper
- Session-start hook installation
- Agent template fetching and generation
- Model capability mapping per harness
- Single source of truth: `.atelier/config.json`

**Out of scope:**
- Cursor support (no hooks documented)
- Codex support (no agent model selection documented)
- Custom skill registries (only `martinffx/atelier`)
- Agent skill attachment (future feature)
- Interactive wizard mode

## User Stories

**US-1: Initialize project**
As a developer, I want to run one command to set up atelier for my project, so that I can start using spec-driven development immediately.
- Given I'm in a project directory, when I run `bunx atelier@latest init`, then it detects my harness, installs skills, installs the hook, and creates `.atelier/config.json`
- Priority: must

**US-2: Update installation**
As a developer, I want to update atelier when skills or templates change, so that I get the latest workflows without reconfiguring.
- Given I have an existing `.atelier/config.json`, when I run `bunx atelier@latest update`, then it re-fetches skills, re-fetches templates, and regenerates harness files
- Priority: must

**US-3: Remove atelier**
As a developer, I want to cleanly remove atelier from my project, so that no generated files or hooks remain.
- Given I have atelier installed, when I run `bunx atelier@latest remove`, then it deletes all generated files and restores the project to pre-installation state
- Priority: must

## Constraints

- **CLI built with**: TypeScript + Bun runtime
- **CLI dependencies OK**: commander, inquirer, @types/node for UX
- **User project zero deps**: Only `.atelier/config.json` + generated files
- **Build output**: Compiled to `dist/` directory, `bin/atelier` entry point
- **Skills universal**: Skills are never modified per harness
- **Fetched templates**: Agent templates pulled from GitHub, not bundled
- **Single source of truth**: `.atelier/config.json` drives all generation

## Context

### Existing Structure

```
atelier/
├── skills/                 # 34 skills (universal)
├── agents/                 # 3 agent personas (Claude-specific format)
│   ├── scout.md
│   ├── oracle.md
│   └── architect.md
├── hooks/
│   └── session-start       # Claude Code hook
└── .claude-plugin/
    └── marketplace.json    # Claude plugin manifest
```

### Skills System

Skills are installed via `npx skills add martinffx/atelier` which downloads to:
- Project-scoped: `./.agents/skills/atelier/`
- Global (`--global`): `~/.agents/skills/atelier/`

The skills CLI uses symlinks by default to make skills available across harnesses. Agent-specific directories (`.claude/skills/`, `.cursor/skills/`) are automatically managed.

### Agent Templates

The current `agents/*.md` files ARE the templates. They are harness-agnostic agent definitions:

```yaml
---
name: scout
description: Fast codebase reconnaissance
---
You are the Scout...
```

The CLI fetches these from GitHub and injects the harness-specific `model` field. No other transformation needed — the prompt body is the same across harnesses.

**Template fetching URL:**
```
https://raw.githubusercontent.com/martinffx/atelier/main/agents/{name}.md
```

### Agent Formats

Claude Code agents use YAML frontmatter with `model` field (e.g., `model: haiku`).
OpenCode agents use YAML frontmatter with `model` field using `provider/model-id` format (e.g., `model: opencode/claude-haiku-4-5`).

The only difference is the `model` identifier format — the prompt body is identical.

### Hook Mechanisms

Claude Code: `hooks/session-start` bash script outputs JSON with `additionalContext`.
OpenCode: `.opencode/plugins/*.js` exports plugin with `config` and `experimental.chat.system.transform` hooks.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Project                            │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ .atelier/    │───→│ CLI Script   │───→│ GitHub       │  │
│  │ config.json  │    │ (bunx)       │    │ (templates)  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                                │
│         │            ┌──────┴──────┐                        │
│         │            │             │                        │
│         ↓            ↓             ↓                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ hooks/   │  │ .claude  │  │ .opencode│                  │
│  │          │  │ -plugin/ │  │ /        │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **CLI Entry** (`bin/atelier.js`): Argument parsing, command dispatch
2. **Config Manager** (`src/config.js`): Read/write `.atelier/config.json`
3. **Harness Detector** (`src/detect.js`): Detect Claude Code vs OpenCode
4. **Skills Installer** (`src/skills.js`): Wrapper around `npx skills add`
5. **Template Fetcher** (`src/templates.js`): Fetch agent templates from GitHub
6. **Settings Generator** (`src/generators/settings.js`): Update harness settings (model, hooks)
7. **Agent Generator** (`src/generators/agents.js`): Generate harness-specific agent files

## Commands

### `init`

```
bunx atelier@latest init [--harness=claude|opencode] [--all] [--yes] [--global]
```

Installs hooks and agents. Prompts for model selection per agent. Re-running `init` on an existing installation re-prompts for models and regenerates files.

**Flow:**
1. Check if `.atelier/config.json` exists
2. **If no config (fresh install):**
   - Detect harness (or use `--harness` flag)
   - Create `.atelier/config.json`
3. **If config exists (re-run to update models):**
   - Read existing config
   - **If harness changed**: Clean old harness files first
     ```
     WARNING: Switching from claude to opencode.
     This will remove .claude/ files and generate .opencode/ files.
     Continue? (y/N)
     ```
   - Show current models
4. Fetch agent templates from GitHub
5. Prompt user to select/confirm model for each agent (skipped with `--yes`):
   ```
   Select model for scout (current: haiku):
   > haiku
     sonnet
     opus
   ```
6. Install hook for detected harness (overwrites existing)
7. Generate agent files with selected models (overwrites existing)
8. Print next steps (e.g., "Run `npx skills add martinffx/atelier` to install skills")

**Idempotency:** Re-running `init` is safe. It will:
- Keep existing config (update models if changed)
- Regenerate all harness files
- Not delete anything unless harness changes

**With `--all` flag:** Also runs `npx skills add martinffx/atelier` automatically.

**With `--yes` flag:** Use default models, no prompts. For CI/CD.

**With `--global` flag:** Install skills globally (`~/.agents/skills/`) instead of project-scoped (`./.agents/skills/`).

### `update`

```
bunx atelier@latest update
```

Updates hooks and agents. Does NOT touch skills (managed by `npx skills`).

1. Read `.atelier/config.json`
2. Re-fetch agent templates from GitHub
3. Regenerate hook (in case template changed)
4. Regenerate agent files from config
5. Print: "Skills not updated. Run `npx skills update martinffx/atelier` if needed."

### `remove`

```
bunx atelier@latest remove
```

Removes all atelier-generated files.

1. Read `.atelier/config.json`
2. Delete generated files:
   - `.claude/settings.json` (atelier-specific entries only, or full file if atelier created it)
   - `.claude/agents/` (scout.md, oracle.md, architect.md)
   - `hooks/atelier-session-start`
   - `opencode.json` (atelier-specific entries)
   - `.opencode/plugins/atelier.js`
   - `.opencode/agents/` (scout.md, oracle.md, architect.md)
3. Delete `.atelier/` directory
4. Print: "Atelier removed. Skills remain installed. Run `npx skills remove martinffx/atelier` to remove skills."

## Data Model

### `.atelier/config.json`

```json
{
  "version": "1.0.0",
  "harness": "claude",
  "skills_source": "martinffx/atelier",
  "skills_path": "~/.agents/skills/atelier",
  "agents": [
    {
      "template": "scout",
      "name": "scout",
      "model": "haiku"
    },
    {
      "template": "oracle",
      "name": "oracle", 
      "model": "opus"
    },
    {
      "template": "architect",
      "name": "architect",
      "model": "opus"
    }
  ]
}
```

Note: Harness default model (e.g., Claude's `opusplan`) is managed by the harness itself, not stored in this config.

### Model Registry

Available models defined in `src/models.json`:

```json
{
  "claude": [
    "haiku",
    "sonnet",
    "opus"
  ],
  "opencode": [
    "opencode-go/qwen3.6-plus",
    "opencode-go/minimax-m2.7",
    "opencode-go/kimi-k2.6",
    "opencode-go/glm-5.1",
    "opencode-go/deepseek-v4-pro",
    "opencode-go/deepseek-v4-flash",
    "opencode/claude-haiku-4-5",
    "opencode/claude-sonnet-4-6",
    "opencode/claude-opus-4-7",
    "opencode/gpt-5.3-codex-spark",
    "opencode/gpt-5.3-codex",
    "opencode/gpt-5.5",
    "opencode/gpt-5.4"
  ]
}
```

### Default Models

Sensible defaults per agent (used with `--yes` or as prompt defaults):

| Agent | Claude | OpenCode |
|-------|--------|----------|
| scout | haiku | opencode/deepseek-v4-flash |
| oracle | opus | opencode-go/kimi-k2.6 |
| architect | opus | opencode-go/deepseek-v4-pro |

**Claude Code**:
- Harness default model: `opusplan` (opus in plan mode, sonnet in other modes)
- Subagent models: per table above (scout=haiku, oracle=opus, architect=opus)
- Primary agent config: managed by Claude Code settings (not atelier)

**OpenCode**:
- Built-in primary agents (Build, Plan) configured by atelier:
  ```json
  {
    "agent": {
      "build": { "mode": "primary", "model": "opencode/deepseek-v4-flash" },
      "plan": { "mode": "primary", "model": "opencode/deepseek-v4-pro" }
    }
  }
  ```
- Atelier agents are all subagents (`mode: subagent`) with models per table above

No abstraction layer. Users select actual model names. Config stores the raw model identifier.

## Generated Files

### Claude Code

```
.claude/
├── settings.json             # Project settings: model, hooks
└── agents/
    ├── scout.md              # model: haiku
    ├── oracle.md             # model: opus
    └── architect.md          # model: opus

hooks/
└── atelier-session-start     # Hook script injected by settings
```

**`.claude/settings.json`** (created/updated by atelier):
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "opusplan",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "command": "${PWD}/hooks/atelier-session-start",
            "type": "command"
          }
        ],
        "matcher": "startup|clear|compact"
      }
    ]
  }
}
```

Merges with existing project settings (if any) without overwriting unrelated fields.

### OpenCode

```
opencode.json                 # Primary agents (Build, Plan) - created/updated by atelier
.opencode/
├── plugins/
│   └── atelier.js            # Config + transform hooks
└── agents/
    ├── scout.md              # mode: subagent, model: opencode/deepseek-v4-flash
    ├── oracle.md             # mode: subagent, model: opencode-go/kimi-k2.6
    └── architect.md          # mode: subagent, model: opencode-go/deepseek-v4-pro
```

## Trade-offs

### Approach: Template Registry + CLI Generator (chosen)

**Pros:**
- Single source of truth (`.atelier/config.json`)
- Templates fetched dynamically (always latest)
- Zero dependencies in user project
- Harness-agnostic agent definitions

**Cons:**
- Requires network access for template fetching
- CLI must handle GitHub API rate limits
- Generated files are ephemeral (regenerated on update)

### Alternative: Static Harness Directories

**Pros:**
- No network dependency after clone
- Simpler mental model

**Cons:**
- Massive duplication (`.claude-plugin/`, `.opencode/`, `.codex-plugin/`)
- Model mappings hardcoded in agent files
- Every template change requires editing N files

**Why chosen approach wins:** Maintenance burden of static directories is unacceptable for 34 skills and 3 agents across N harnesses.

### Alternative: Bundled Templates

**Pros:**
- Works offline
- Faster execution

**Cons:**
- Templates stale until CLI update
- Increases package size

**Why rejected:** Skills CLI already requires network; templates change infrequently enough that fetch-on-init is acceptable.

## Open Questions

1. Should `remove` uninstall skills via `npx skills remove` or leave them?
2. Should we cache fetched templates in `.atelier/cache/` to avoid re-fetching?
3. How do we handle GitHub API rate limits for template fetching?

## Files to Create

```
atelier/
├── bin/
│   └── atelier.js            # CLI entry point
├── src/
│   ├── commands/
│   │   ├── init.js
│   │   ├── update.js
│   │   └── remove.js
│   ├── generators/
│   │   ├── claude.js         # .claude/settings.json + agents + hook
│   │   ├── opencode.js       # opencode.json + agents + plugin
│   │   └── agents.js         # Shared agent generation logic
│   └── utils/
│       ├── config.js
│       ├── detect.js
│       ├── skills.js
│       ├── templates.js
│       └── fetch.js
└── package.json              # npm package config with bin entry
```

## Success Criteria

- [ ] `bunx atelier@latest init` completes without errors on Claude Code project
- [ ] `bunx atelier@latest init` completes without errors on OpenCode project
- [ ] `.claude/settings.json` sets model and hooks correctly
- [ ] `opencode.json` configures primary agents (Build, Plan)
- [ ] Subagents generated with correct model per harness
- [ ] `bunx atelier@latest update` refreshes templates without losing config
- [ ] `bunx atelier@latest remove` deletes all generated files
- [ ] User project has zero dependencies after installation
