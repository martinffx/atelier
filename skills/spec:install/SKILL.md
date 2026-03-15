---
name: spec:install
description: >
  Install this Claude Code plugin into another AI coding tool (opencode, Claude Code,
  Gemini CLI, Codex CLI, Windsurf, etc.). Use when the user asks to install, port,
  migrate, or sync this plugin to another tool, or asks "how do I use this in X".
  Triggered by phrases like "install atelier", "port to opencode", "sync to Claude",
  "how do I use this in cursor", or "add to Codex".
user-invocable: true
---

# Install Plugin into Another Tool

Install atelier into your preferred AI coding tool.

## Supported Tools

| Tool | Install Method | Reference |
|------|---------------|-----------|
| Claude Code | Marketplace or local plugin | [claude-code.md](./references/claude-code.md) |
| OpenCode | Manual command/agent/skill setup | [opencode.md](./references/opencode.md) |
| Gemini CLI | compound-plugin | See below |
| Codex CLI | compound-plugin | See below |
| Windsurf | compound-plugin | See below |

## Claude Code

### Marketplace Install

```bash
npx skills add martinffx/atelier
```

Install specific skills:

```bash
npx skills add martinffx/atelier --skill spec:plan
npx skills add martinffx/atelier --skill spec:research
```

### Local Development

```bash
claude --plugin-dir /path/to/atelier
```

See [claude-code.md](./references/claude-code.md) for detailed instructions.

## OpenCode

### Manual Installation

1. Create commands in `~/.config/opencode/command/`
2. Create agents in `~/.config/opencode/agent/`
3. Symlink skills to `~/.config/opencode/skills/`

See [opencode.md](./references/opencode.md) for step-by-step commands.

## Other Tools

Use `@every-env/compound-plugin` to convert to other AI coding tools:

```bash
bunx @every-env/compound-plugin install martinffx/atelier --to <tool>
```

Replace `<tool>` with: `codex`, `gemini`, `copilot`, `windsurf`, `kiro`, `qwen`, `openclaw`, `droid`, `pi`

### Auto-Detect All Tools

```bash
bunx @every-env/compound-plugin install martinffx/atelier --to all
```

## Sync Personal Config

To sync your personal Claude Code config to other tools:

```bash
# Sync to all detected tools
bunx @every-env/compound-plugin sync

# Sync to specific tool
bunx @every-env/compound-plugin sync --target opencode
```

## What Gets Converted

| Component | Claude Code | OpenCode | Other Tools |
|-----------|-------------|----------|--------------|
| Skills | ✓ | ✓ symlink | ✓ |
| Commands | ✓ | ✓ | ✓ |
| Agents | ✓ | ✓ | varies |
| MCP servers | ✓ | ✓ | ✓ |
| Hooks | ✓ | manual | varies |

## Notes

- Skills are symlinked (not copied) where possible — changes reflect immediately
- Claude Code and OpenCode have the most complete support
- Other tools are experimental and may change as formats evolve
