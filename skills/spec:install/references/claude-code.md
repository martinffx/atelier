# Claude Code Installation

Install atelier into Claude Code via the plugin marketplace.

## Marketplace Install

Install atelier as a Claude Code plugin:

```bash
/plugin marketplace add martinffx/atelier
/plugin install atelier
```

Or install specific plugin components:

```bash
/plugin install atelier/spec
/plugin install atelier/oracle
/plugin install atelier/typescript
```

This installs:
- All skills in `skills/` directory (skills with `user-invocable: true` become commands)
- All agents in `agents/` directory
- Hooks defined in `.claude-plugin/marketplace.json`

## Skills as Commands

Skills with `user-invocable: true` in frontmatter can be invoked directly as commands:

```bash
/spec:research    # spec:research skill
/spec:plan        # spec:plan skill
/spec:implement  # spec:implement skill
/spec:finish     # spec:finish skill
/code:debug       # code:debug skill
/code:review      # code:review skill
/code:commit     # code:conventional-commit skill
```

## Local Development

For development or testing the plugin locally:

```bash
claude --plugin-dir /path/to/atelier
```

Replace `/path/to/atelier` with the actual path to the atelier repository.

After making changes to skills, restart Claude Code to reload.

## Plugin Structure

The plugin is defined in `.claude-plugin/marketplace.json`:

```json
{
  "name": "atelier",
  "plugins": [
    {
      "name": "spec",
      "skills": ["./skills/spec:*"],
      "agents": ["./agents/*"]
    },
    {
      "name": "oracle",
      "skills": ["./skills/oracle:*"]
    },
    {
      "name": "typescript",
      "skills": ["./skills/typescript:*"]
    },
    {
      "name": "python",
      "skills": ["./skills/python:*"]
    },
    {
      "name": "code",
      "skills": ["./skills/code:*"]
    }
  ]
}
```

## Config Location

- Global: `~/.claude/settings.json`
- Skills: `~/.claude/skills/`

## Available Commands After Install

- `/spec:research` - Discovery and requirements gathering
- `/spec:plan` - Create implementation plan
- `/spec:implement` - Execute implementation tasks
- `/spec:finish` - Validate and prepare for PR
- `/oracle:challenge` - Challenge an approach
- `/oracle:thinkdeep` - Deep analysis
- `/code:debug` - Debugging workflow
- `/code:review` - Code review
- `/code:commit` - Conventional commits
