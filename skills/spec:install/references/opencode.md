# OpenCode Installation

Install atelier into opencode by creating commands, agents, and symlinking skills.

## Directory Structure

```
~/.config/opencode/
├── command/
│   ├── spec/
│   │   ├── finish.md
│   │   ├── implement.md
│   │   ├── plan.md
│   │   └── research.md
│   ├── oracle/
│   │   ├── challenge.md
│   │   └── thinkdeep.md
│   └── code/
│       ├── commit.md
│       ├── debug.md
│       └── review.md
├── agent/
│   ├── oracle.md
│   ├── architect.md
│   └── clerk.md
└── skills/
    └── atelier -> symlink to atelier/skills/
```

## Command Format

Commands are simple wrappers that invoke skills:

```yaml
---
description: [description from skill]
---

Invoke skill: [skill:name]
```

## Agent Format

Agents use opencode-specific frontmatter:

```yaml
---
description: [description]
mode: primary
model: opencode-go/[model]
temperature: 0.0-1.0
permission:
  edit: allow
  bash: ask
---
```

## Recommended Models

| Agent | Model | Temperature |
|-------|-------|-------------|
| oracle | opencode-go/kimi-k2.5 | 0.2 |
| architect | opencode-go/glm-5 | 0.3 |
| clerk | opencode-go/minimax-m2.5 | 0.1 |

## Installation Steps

### 1. Create Command Directories

```bash
mkdir -p ~/.config/opencode/command/spec
mkdir -p ~/.config/opencode/command/oracle
mkdir -p ~/.config/opencode/command/code
```

### 2. Create Commands

**spec:finish:**
```yaml
---
description: Post-implementation validation and PR preparation
---

Invoke skill: spec:finish
```

**spec:implement:**
```yaml
---
description: Execute implementation tasks from plan.json
---

Invoke skill: spec:implement
```

**spec:plan:**
```yaml
---
description: Write implementation plans with human review
---

Invoke skill: spec:plan
```

**spec:research:**
```yaml
---
description: Discovery, research, and architecture for new features
---

Invoke skill: spec:research
```

**oracle:challenge:**
```yaml
---
description: Challenge an approach with critical thinking
---

Invoke skill: oracle:challenge
```

**oracle:thinkdeep:**
```yaml
---
description: Extended reasoning analysis using sequential thinking
---

Invoke skill: oracle:thinkdeep
```

**code:commit:**
```yaml
---
description: Generate and validate conventional commit messages
---

Invoke skill: code:conventional-commit
```

**code:debug:**
```yaml
---
description: Systematic debugging workflow and techniques
---

Invoke skill: code:debug
```

**code:review:**
```yaml
---
description: Comprehensive code review for quality, security, performance
---

Invoke skill: code:review
```

### 3. Create Agents

**oracle:**
```yaml
---
description: Creative problem solver who conducts strategic interviews and explores alternative approaches
mode: primary
model: opencode-go/kimi-k2.5
temperature: 0.2

permission:
  edit: allow
  bash: ask
---
```

**architect:**
```yaml
---
description: Structured problem solver who designs technical architecture and implementation plans
mode: primary
model: opencode-go/glm-5
temperature: 0.3

permission:
  edit: allow
  bash: ask
---
```

**clerk:**
```yaml
---
description: Context retrieval specialist who searches documentation and provides summarized information
mode: primary
model: opencode-go/minimax-m2.5
temperature: 0.1

permission:
  edit: deny
  bash: ask
---
```

### 4. Symlink Skills

```bash
mkdir -p ~/.config/opencode/skills
ln -s /path/to/atelier/skills ~/.config/opencode/skills/atelier
```

Replace `/path/to/atelier` with the actual path to the atelier repository.

### 5. Verify Installation

```bash
ls ~/.config/opencode/command/spec/
ls ~/.config/opencode/command/oracle/
ls ~/.config/opencode/command/code/
ls ~/.config/opencode/agent/
ls ~/.config/opencode/skills/
```

## Troubleshooting

- Commands not showing: Restart opencode
- Skills not loading: Check symlink is valid
- Agent models wrong: Verify model names in frontmatter

## Config Location

`~/.config/opencode/opencode.json`
