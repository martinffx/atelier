# Verification Commands

Quick reference for verification commands by project type.

## JavaScript/TypeScript

```bash
# Run tests
npm test
npm run test:watch
npm run test:coverage

# Type checking
npm run typecheck
npm run typecheck -- --noEmit
npx tsc --noEmit

# Linting
npm run lint
npm run lint:fix
npx biome check .
npx eslint .

# Formatting
npm run format
npm run format:check
npx prettier --check .
npx biome format .

# Build
npm run build
npm run build:watch
```

## Python

```bash
# Run tests
pytest
pytest -v
pytest --cov

# Type checking
mypy .
pyright .

# Linting
ruff check .
flake8 .
pylint .

# Formatting
ruff format .
black .
isort .

# All checks
ruff check . && mypy . && pytest
```

## Rust

```bash
# Run tests
cargo test
cargo test --lib
cargo test --doc

# Type checking
cargo check

# Linting
cargo clippy
cargo clippy --fix

# Formatting
cargo fmt
cargo fmt --check

# Build
cargo build
cargo build --release
```

## Verification Checklist

- [ ] Tests run and pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Formatting is correct
- [ ] Manual verification done
- [ ] Evidence documented

## Before Commit

```bash
# Pre-commit checks
npm run lint && npm run typecheck && npm test
# OR
ruff check . && mypy . && pytest
# OR  
cargo clippy && cargo fmt && cargo test
```
