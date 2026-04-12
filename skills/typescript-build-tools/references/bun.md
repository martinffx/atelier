# Bun Package Manager and Task Runner

Comprehensive guide to using Bun as a package manager and task runner in TypeScript projects.

## Package Management

### Installation

```bash
# Install all dependencies
bun install

# Install with frozen lockfile (CI)
bun install --frozen-lockfile

# Install production dependencies only
bun install --production

# Clean install (removes node_modules first)
bun install --force
```

### Adding Dependencies

```bash
# Add runtime dependency
bun add fastify drizzle-orm @sinclair/typebox

# Add dev dependency
bun add -D vitest @biomejs/biome typescript

# Add specific version
bun add react@18.2.0

# Add from git
bun add user/repo
bun add user/repo#branch-or-commit
bun add github:user/repo
```

### Removing Dependencies

```bash
# Remove package
bun remove package-name

# Remove multiple packages
bun remove package1 package2 package3
```

### Updating Dependencies

```bash
# Update all dependencies
bun update

# Update specific package
bun update package-name

# Update to latest (including breaking changes)
bun update --latest
```

### Viewing Dependencies

```bash
# List installed packages
bun pm ls

# List dependencies of a package
bun pm ls package-name

# Show outdated packages
bun outdated
```

## Task Runner

### Running Scripts

**Critical:** Use `bun run test` (not `bun test`) on Node projects. `bun test` invokes Bun's native test runner, which expects Bun-style test files, not your package.json test script.

```bash
# Run script from package.json
bun run dev
bun run test
bun run build
bun run typecheck

# List available scripts
bun run

# Run with arguments
bun run build --production
bun run test src/users.test.ts
```

### Running TypeScript Directly

```bash
# Execute TypeScript file (no build step)
bun run src/index.ts

# Execute with arguments
bun run src/cli.ts --help

# Watch mode (restart on file changes)
bun run --watch src/index.ts

# Hot reload (reload modules without restart)
bun run --hot src/index.ts
```

### Environment Variables

```bash
# Load from .env file
bun run --env-file .env src/index.ts

# Load from custom env file
bun run --env-file .env.production src/index.ts

# Multiple env files (last one wins)
bun run --env-file .env --env-file .env.local src/index.ts
```

## Build Command

### Basic Build

```bash
# Build for Bun runtime
bun build ./src/index.ts --outdir ./dist --target bun

# Build for Node.js runtime
bun build ./src/index.ts --outdir ./dist --target node

# Build for browser
bun build ./src/index.ts --outdir ./dist --target browser
```

### Build Options

```bash
# Minify output
bun build ./src/index.ts --outdir ./dist --target bun --minify

# Generate sourcemaps
bun build ./src/index.ts --outdir ./dist --sourcemap

# External dependencies (don't bundle)
bun build ./src/index.ts --outdir ./dist --external fastify --external drizzle-orm

# Set entry point name
bun build ./src/index.ts --outfile ./dist/server.js

# Bundle format
bun build ./src/index.ts --outdir ./dist --format esm
bun build ./src/index.ts --outdir ./dist --format cjs
```

### Multiple Entry Points

```bash
# Build multiple files
bun build ./src/index.ts ./src/worker.ts --outdir ./dist --target bun

# Build all files in directory
bun build ./src/*.ts --outdir ./dist --target bun
```

### Production Builds

```json
{
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun --minify --sourcemap"
  }
}
```

## bunfig.toml Configuration

### Basic Configuration

```toml
[install]
# Use frozen lockfile (equivalent to --frozen-lockfile)
frozen = true

# Prefer offline installation
prefer-offline = true

# Auto-install peer dependencies
auto = true

[install.lockfile]
# Print lockfile in yarn format (easier to review)
print = "yarn"

# Save lockfile (default: true)
save = true

[run]
# Silence script output header
silent = true

# Automatically restart on crash
restart = false

[test]
# Coverage directory
coverage = "./coverage"

# Coverage threshold
coverageThreshold = 80
```

### Registry Configuration

```toml
[install.scopes]
# Use custom registry for @myorg packages
"@myorg" = { url = "https://npm.pkg.github.com", token = "$GH_TOKEN" }

# Use npm registry for everything else
"*" = { url = "https://registry.npmjs.org" }
```

### Cache Configuration

```toml
[install.cache]
# Disable cache
disable = false

# Cache directory
dir = "~/.bun/install/cache"
```

## Workspaces (Monorepo)

### Root package.json

```json
{
  "name": "my-monorepo",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build"
  }
}
```

### Adding Dependencies to Workspace

```bash
# Add to specific workspace
bun add fastify --workspace @myorg/api

# Add to all workspaces
bun add -D typescript --workspace=*

# Add to root workspace
bun add -D turbo
```

### Running Scripts in Workspaces

```bash
# Run script in specific workspace
bun run --filter @myorg/api dev

# Run script in all workspaces
bun run --filter "**" test
```

## Common Patterns

### Development Script

```json
{
  "scripts": {
    "dev": "bun run --watch --env-file .env src/index.ts"
  }
}
```

### Build and Deploy

```json
{
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun --minify",
    "start": "bun run --env-file .env.production dist/index.js",
    "deploy": "bun run build && wrangler deploy"
  }
}
```

### Testing

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### Code Quality

```json
{
  "scripts": {
    "typecheck": "tsgo --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "check": "bun run typecheck && bun run lint && bun run test"
  }
}
```

### Monorepo Scripts

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "lint": "turbo lint",
    "clean": "turbo clean && rm -rf node_modules",
    "check": "turbo typecheck lint test"
  }
}
```

## Performance Tips

### Use `bun install` Instead of `npm install`

Bun is significantly faster at installing dependencies:

```bash
# Slow
npm install

# Fast
bun install
```

### Use `--frozen-lockfile` in CI

Prevents lockfile changes and ensures reproducible builds:

```bash
bun install --frozen-lockfile
```

### Cache Dependencies in CI

```yaml
# GitHub Actions
- uses: actions/cache@v4
  with:
    path: ~/.bun/install/cache
    key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}
    restore-keys: |
      ${{ runner.os }}-bun-
```

### Use `--production` for Production Builds

Skip devDependencies installation:

```bash
bun install --production --frozen-lockfile
```

## Troubleshooting

### Lockfile Conflicts

```bash
# Regenerate lockfile
rm bun.lock
bun install

# Or use --force to clean install
bun install --force
```

### Cache Issues

```bash
# Clear Bun cache
bun pm cache rm

# Or manually delete cache
rm -rf ~/.bun/install/cache
```

### Version Conflicts

```bash
# Check for duplicate packages
bun pm ls package-name

# Deduplicate dependencies
bun dedupe
```

## Best Practices

1. **Use `bun run test`** not `bun test` for Node projects
2. **Use `--frozen-lockfile`** in CI for reproducible builds
3. **Use `--production`** when building Docker images
4. **Configure bunfig.toml** for team-wide settings
5. **Use workspaces** for monorepos instead of npm/yarn workspaces
6. **Cache `~/.bun/install/cache`** in CI for faster builds
7. **Use `bun run --watch`** for development hot reload
8. **Use `bun build`** for production builds with `--minify` and `--sourcemap`
9. **Use `bun run --env-file`** instead of dotenv packages
10. **Keep bun.lock** in version control for reproducible builds
