# Biome Configuration Guide

Detailed Biome rules and configuration patterns for TypeScript projects.

## Configuration Hierarchy

Biome searches for configuration in this order:
1. `biome.json` in current directory
2. `biome.jsonc` in current directory
3. Parent directories (up to root)

## Formatter Options

### Indentation Style

```json
{
  "formatter": {
    "indentStyle": "tab",     // "tab" or "space"
    "indentWidth": 2,         // 2 or 4
    "lineWidth": 100          // 80, 100, or 120
  }
}
```

### JavaScript/TypeScript Specific

```json
{
  "javascript": {
    "formatter": {
      "quoteStyle": "double",           // "double" or "single"
      "trailingCommas": "es5",          // "all", "es5", or "none"
      "semicolons": "always",           // "always" or "asNeeded"
      "arrowParentheses": "always",     // "always" or "asNeeded"
      "bracketSameLine": false,
      "bracketSpacing": true
    }
  }
}
```

## Linter Rules

### Recommended (Default)

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

### Strict Configuration

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noForEach": "error",
        "noUselessFragments": "error",
        "useLiteralKeys": "error"
      },
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error",
        "useHookAtTopLevel": "error"
      },
      "performance": {
        "noDelete": "error",
        "noAccumulatingSpread": "warn"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useNodejsImportProtocol": "error",
        "useImportType": "error",
        "useExportType": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noConfusingVoidType": "error"
      }
    }
  }
}
```

### Rule Explanations

| Rule | Why | Example |
|------|-----|---------|
| `noForEach` | Prefer `for...of` - better performance, supports `break`/`continue` | ❌ `arr.forEach(x => ...)` ✅ `for (const x of arr)` |
| `noDelete` | Use `Map.delete()` or object destructuring - `delete` is slow | ❌ `delete obj.key` ✅ `const { key, ...rest } = obj` |
| `useNodejsImportProtocol` | Use `node:fs` instead of `fs` - explicit, avoids bundler issues | ❌ `import fs from 'fs'` ✅ `import fs from 'node:fs'` |
| `noNonNullAssertion` | Avoid `!` assertions - use proper null checks | ❌ `user!.name` ✅ `user?.name` |
| `noExplicitAny` | Use `unknown` and narrow types - better type safety | ❌ `data: any` ✅ `data: unknown` |
| `noUnusedImports` | Clean imports - reduces bundle size | ❌ `import { unused } from 'lib'` |
| `useImportType` | Use `import type` for types - helps tree-shaking | ❌ `import { User } from './types'` ✅ `import type { User } from './types'` |
| `noAccumulatingSpread` | Avoid spread in loops - O(n²) complexity | ❌ `arr = [...arr, x]` in loop ✅ `arr.push(x)` |
| `useLiteralKeys` | Use literals instead of computed properties | ❌ `{ ['key']: value }` ✅ `{ key: value }` |

## File Ignoring

### Via biome.json

```json
{
  "files": {
    "ignore": [
      "dist",
      "node_modules",
      "*.gen.ts",
      "drizzle/**",
      "coverage/**"
    ],
    "ignoreUnknown": true
  }
}
```

### Via .biomeignore

```
# Generated files
dist/
coverage/
*.gen.ts

# Dependencies
node_modules/

# Drizzle migrations
drizzle/
```

## Organize Imports

```json
{
  "organizeImports": {
    "enabled": true
  }
}
```

This automatically groups and sorts imports:

```typescript
// Before
import { useState } from 'react'
import fs from 'node:fs'
import { User } from './types'
import path from 'node:path'

// After (organized)
import fs from 'node:fs'
import path from 'node:path'

import { useState } from 'react'

import { User } from './types'
```

## VCS Integration

```json
{
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main"
  }
}
```

Benefits:
- Respects `.gitignore` patterns
- Only formats tracked files
- Integrates with git workflows

## Shareable Config (Monorepo)

### packages/config-biome/package.json

```json
{
  "name": "@myorg/biome-config",
  "version": "1.0.0",
  "main": "biome.json",
  "files": ["biome.json"]
}
```

### packages/config-biome/biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "formatter": {
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "es5"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noForEach": "error"
      },
      "performance": {
        "noDelete": "error"
      },
      "style": {
        "useNodejsImportProtocol": "error"
      }
    }
  },
  "organizeImports": {
    "enabled": true
  }
}
```

### apps/api/biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "extends": ["@myorg/biome-config"],
  "files": {
    "ignore": ["dist/**"]
  }
}
```

## Using with ESLint

Biome can coexist with ESLint for type-aware rules that Biome doesn't support:

```json
// biome.json - handle formatting and most linting
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

```javascript
// eslint.config.js - type-aware rules only
import tseslint from 'typescript-eslint'
import boundaries from 'eslint-plugin-boundaries'

export default tseslint.config({
  plugins: {
    boundaries,
  },
  rules: {
    // Type-aware rules Biome can't do
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    // Architectural boundaries
    'boundaries/element-types': 'error',
  },
})
```

### Dual Linting Scripts

```json
{
  "scripts": {
    "lint": "biome check ./src && eslint ./src --max-warnings 0",
    "lint:fix": "biome check --write ./src && eslint --fix ./src"
  }
}
```

## CLI Commands

```bash
# Check all files (lint + format check)
biome check .

# Fix all files (lint + format)
biome check --write .

# Format only
biome format --write .

# Lint only
biome lint .

# Check specific files
biome check src/

# CI mode (fail on any issue)
biome ci .

# Show what would be changed (dry run)
biome check --write --dry-run .
```

## Migration from ESLint/Prettier

```bash
# Generate Biome config from existing configs
biome migrate --write

# Migrate ESLint config
biome migrate eslint --write

# Migrate Prettier config
biome migrate prettier --write
```

After migration:
1. Review generated `biome.json`
2. Test on a few files
3. Remove ESLint/Prettier configs
4. Uninstall old packages: `bun remove eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`

## Editor Integration

### VSCode

Install the Biome extension:

```bash
code --install-extension biomejs.biome
```

Settings (`.vscode/settings.json`):

```json
{
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "quickfix.biome": "explicit",
      "source.organizeImports.biome": "explicit"
    }
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  }
}
```

### Recommended Extensions

For VSCode workspace, add to `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "biomejs.biome"
  ],
  "unwantedRecommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

## Pre-commit Hooks

### Using Husky + lint-staged

```bash
bun add -D husky lint-staged
```

`.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

bun run lint-staged
```

`package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "biome check --write --no-errors-on-unmatched"
    ]
  }
}
```

## Performance

Biome is significantly faster than ESLint + Prettier:

| Tool | Speed (10k files) |
|------|-------------------|
| ESLint + Prettier | ~45s |
| Biome | ~1.5s |

## Best Practices

1. **Use tabs** for accessibility - users can set their preferred width
2. **Set line width to 100** - balances readability and screen space
3. **Use double quotes** - consistent with JSON, less escaping in HTML
4. **Enable organize imports** - cleaner diffs, easier to read
5. **Enable VCS integration** - respects .gitignore
6. **Use recommended rules** as baseline
7. **Add strict rules gradually** - `noForEach`, `noDelete`, `useNodejsImportProtocol`
8. **Share config in monorepos** via workspace package
9. **Use ESLint alongside** for type-aware rules only
10. **Run `biome ci`** in CI - fails on any issue
11. **Configure editor integration** - format on save
12. **Use pre-commit hooks** - catch issues before commit
