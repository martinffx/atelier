# Turborepo Monorepo Orchestration

Patterns for configuring Turborepo to orchestrate TypeScript monorepo builds, tests, and development.

## Basic Setup

### Root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "lint": "turbo lint",
    "check": "turbo typecheck lint test"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

## Task Configuration

### dependsOn

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"]  // Run build in dependencies first
    },
    "test": {
      "dependsOn": ["build"]   // Run build in same package first
    },
    "deploy": {
      "dependsOn": ["build", "test", "lint"]  // Run all in same package
    }
  }
}
```

- `^task` - Run task in dependencies (topological order)
- `task` - Run task in same package before this task

### outputs

```json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "typecheck": {
      "outputs": []  // No outputs to cache
    }
  }
}
```

### inputs

```json
{
  "tasks": {
    "test": {
      "inputs": ["src/**/*.ts", "test/**/*.ts", "vitest.config.ts"]
    }
  }
}
```

### Environment Variables

```json
{
  "tasks": {
    "build": {
      "env": ["NODE_ENV", "API_URL"],
      "passThroughEnv": ["CI", "VERCEL"]
    },
    "test": {
      "env": ["DATABASE_URL", "TEST_DATABASE_URL"]
    }
  }
}
```

## Workspace Structure

```
my-monorepo/
├── package.json
├── turbo.json
├── biome.json
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
└── packages/
    ├── config-biome/
    │   ├── package.json
    │   └── biome.json
    ├── config-typescript/
    │   ├── package.json
    │   └── tsconfig.base.json
    └── shared/
        ├── package.json
        ├── tsconfig.json
        └── src/
```

### Package Dependencies

```json
// apps/api/package.json
{
  "name": "@myorg/api",
  "dependencies": {
    "@myorg/shared": "workspace:*"
  },
  "devDependencies": {
    "@myorg/config-biome": "workspace:*",
    "@myorg/config-typescript": "workspace:*"
  }
}
```

## Package Scripts

### apps/api/package.json

```json
{
  "name": "@myorg/api",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build ./src/index.ts --outdir ./dist --target bun",
    "typecheck": "tsgo --noEmit",
    "lint": "biome check .",
    "test": "vitest run"
  }
}
```

### packages/shared/package.json

```json
{
  "name": "@myorg/shared",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsgo --noEmit",
    "lint": "biome check .",
    "test": "vitest run"
  }
}
```

## Remote Caching

### Vercel Remote Cache

```bash
# Login to Vercel
npx turbo login

# Link to Vercel project
npx turbo link
```

### GitHub Actions with Remote Cache

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile

      - run: bun run check
```

### Self-Hosted Remote Cache

```bash
# Use turbo with custom remote cache endpoint
turbo build --api="https://cache.example.com" --token="xxx"
```

Add to `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "remoteCache": {
    "signature": true
  }
}
```

## Filtering

### Run in Specific Package

```bash
# Run build only in api
turbo build --filter=@myorg/api

# Run build in api and its dependencies
turbo build --filter=@myorg/api...

# Run build in api and packages that depend on it
turbo build --filter=...@myorg/api
```

### Run Based on Changes

```bash
# Run test only in packages changed since main
turbo test --filter=[main]

# Run test in changed packages and their dependents
turbo test --filter=...[main]

# Run test in changed packages and their dependencies
turbo test --filter=...[main]...
```

### Run by Directory

```bash
# Run all tasks in apps/
turbo build --filter=./apps/*

# Run all tasks in packages/
turbo typecheck --filter=./packages/*
```

## Development Mode

### turbo.json

```json
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^build"]
    }
  }
}
```

### Running Dev

```bash
# Run dev in all packages that have it
turbo dev

# Run dev in specific packages
turbo dev --filter=@myorg/api --filter=@myorg/web

# Run dev with specific concurrency
turbo dev --concurrency=2
```

## Package-Specific Configuration

### Per-Package Task Config

```json
// turbo.json
{
  "tasks": {
    "test": {
      "dependsOn": ["^build"]
    },
    "@myorg/api#test": {
      "dependsOn": ["^build"],
      "env": ["DATABASE_URL"]
    }
  }
}
```

## CI Optimization

### Parallel Execution

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile

      # Run typecheck and lint in parallel (no dependencies)
      - run: turbo typecheck lint

      # Then run tests (may depend on build)
      - run: turbo test
```

### Cache Artifacts

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ github.sha }}
          restore-keys: turbo-

      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: turbo build
```

## Troubleshooting

### See Task Graph

```bash
# Print task graph
turbo build --dry-run

# Print as JSON
turbo build --dry-run=json
```

### Debug Cache

```bash
# See why cache was missed
turbo build --verbosity=2

# Force cache miss
turbo build --force
```

### Clean Cache

```bash
# Clean local cache
rm -rf .turbo

# Clean all caches
turbo prune
```

## Best Practices

1. **Use `^` prefix** for tasks that depend on dependencies being built first
2. **Specify outputs** for cacheable tasks (build, generate)
3. **Don't cache dev** - set `cache: false` for development tasks
4. **Use remote caching** in CI - speeds up PR checks significantly
5. **Filter by changes** - `--filter=[main]` to only run affected packages
6. **Set env vars** explicitly - list all env vars that affect task output
7. **Use workspace:\*** for internal dependencies
8. **Keep shared packages small** - reduces rebuild scope
9. **Run typecheck and lint in parallel** - no dependencies between them
10. **Use persistent mode** for dev servers that should keep running
11. **Cache artifacts in CI** - store `.turbo` directory for faster builds
12. **Use Turbo token** for remote caching - significantly faster PR checks
