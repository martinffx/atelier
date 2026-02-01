# Workspace Configuration Details

Comprehensive pyproject.toml patterns for Python monorepos using uv workspaces.

## Root Workspace Configuration

**pyproject.toml** at repository root defines workspace structure and shared tooling:

```toml
[project]
name = "my-monorepo"
version = "0.1.0"
requires-python = ">=3.12"

[tool.uv.workspace]
members = [
    "apps/*",
    "packages/*"
]

[tool.uv]
dev-dependencies = [
    "pytest>=8.0.0",
    "ruff>=0.8.0",
    "basedpyright>=1.0.0",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "RUF"]

[tool.basedpyright]
typeCheckingMode = "strict"
```

**Key sections:**
- `[project]`: Workspace metadata
- `[tool.uv.workspace]`: Member glob patterns
- `[tool.uv]`: Shared dev dependencies (pytest, linting, type-checking)
- Tool configurations (ruff, basedpyright) shared across all packages

## Package Configuration

Each workspace member has its own `pyproject.toml` with package-specific settings.

### Shared Library (packages/core)

```toml
[project]
name = "my-core"
version = "0.1.0"
requires-python = ">=3.12"
description = "Shared core library"
dependencies = [
    "pydantic>=2.0.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/my_core"]
```

### Package with Dependencies (packages/utils)

```toml
[project]
name = "my-utils"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "my-core",  # Reference workspace package by distribution name
    "python-dateutil>=2.8.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/my_utils"]
```

### Application (apps/api)

```toml
[project]
name = "my-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn>=0.20.0",
    "my-core",      # Workspace package
    "my-utils",     # Workspace package
]

[project.scripts]
api = "my_api.main:run"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/my_api"]
```

## Workspace Member Patterns

### Glob Pattern Variations

```toml
# Include all apps and packages
[tool.uv.workspace]
members = ["apps/*", "packages/*"]

# Include specific subdirectories
[tool.uv.workspace]
members = [
    "apps/api",
    "apps/worker",
    "packages/core",
    "packages/utils",
]

# Namespace package pattern
[tool.uv.workspace]
members = ["packages/acme-*"]  # All packages starting with acme-
```

### Nested Structure

```toml
# For deeply nested layouts
[tool.uv.workspace]
members = [
    "services/*/service",
    "libs/*/library",
]
```

## Shared Tool Configuration

### Pytest Configuration

```toml
[tool.pytest.ini_options]
testpaths = ["packages", "apps"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --strict-markers"
markers = [
    "unit: unit tests",
    "integration: integration tests",
    "slow: slow tests",
]
```

### Ruff Configuration

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",    # Errors
    "F",    # PyFlakes
    "I",    # isort
    "N",    # pep8-naming
    "UP",   # pyupgrade
    "RUF",  # Ruff-specific
]
ignore = ["E501"]  # Line too long (handled by formatter)

[tool.ruff.lint.isort]
known-first-party = ["my_core", "my_utils", "my_api"]
```

### Type Checking (basedpyright)

```toml
[tool.basedpyright]
typeCheckingMode = "strict"
include = ["packages/*/src", "apps/*/src"]
exclude = ["**/tests", "**/__pycache__"]
```

## uv Commands

### Install and Sync

```bash
# Install all workspace dependencies with lock
uv sync

# Sync without installing
uv lock

# Upgrade all dependencies
uv lock --upgrade

# Upgrade specific package
uv lock --upgrade-package fastapi
```

### Add Dependencies

```bash
# Add to root dev dependencies
uv add --dev pytest

# Add to specific workspace package
uv add fastapi --package my-api

# Add workspace package as dependency
uv add my-core --package my-utils

# Add with specific version
uv add "requests>=2.28.0" --package my-api
```

### Run Commands

```bash
# Run in root environment
uv run pytest

# Run in specific package
uv run --package my-api pytest

# Run package entrypoint
uv run --package my-api api

# Run Python module
uv run python -m my_api.main
```

## Multi-Platform Requirements

```toml
[project]
dependencies = [
    "requests",
    "pywin32>=300; sys_platform == 'win32'",  # Windows only
    "fcntl; sys_platform != 'win32'",         # Unix only
]
```

## Optional Dependencies

```toml
[project]
name = "my-api"
dependencies = ["fastapi"]

[project.optional-dependencies]
db = ["sqlalchemy>=2.0.0", "alembic>=1.10.0"]
cache = ["redis>=4.0.0", "pydantic-settings>=2.0.0"]
dev = ["pytest-cov>=4.0.0"]

# Install with extras
# uv sync --extra db --extra cache
```

## Version Pinning Strategies

### Loose Versioning (Recommended for libs)

```toml
dependencies = [
    "pydantic>=2.0.0",     # At least 2.0.0
    "requests<3",          # Before 3.0.0
]
```

### Strict Versioning (For production)

```toml
dependencies = [
    "pydantic==2.5.0",     # Exact version
]
```

### Compatible Release

```toml
dependencies = [
    "pydantic~=2.5.0",     # >= 2.5.0, < 2.6.0
]
```

## Workspace with Conditional Packages

```toml
[tool.uv.workspace]
members = [
    "packages/core",
    "packages/postgres",  # Optional database
    "packages/redis",     # Optional cache
    "apps/*",
]

# Then only include in dependencies when needed
# my-api can depend on my-postgres when database is needed
```

## Dependency Management Best Practices

1. **Keep root dependencies minimal** - Only dev tools that apply to all packages
2. **Version independently** - Each package manages its own versions
3. **Single lock file** - One `uv.lock` at root for reproducibility
4. **Workspace references** - Use distribution names (my-core) not paths
5. **Clear boundaries** - Apps depend on packages, not vice versa

## Summary

**Root config:**
- Defines workspace members via glob patterns
- Specifies shared dev dependencies
- Centralizes tool configuration (ruff, basedpyright, pytest)

**Package config:**
- Independent versioning
- Package-specific dependencies
- Reference other workspace packages by name

**Key commands:**
- `uv sync` - Install all dependencies
- `uv add <pkg> --package <name>` - Add to specific package
- `uv lock --upgrade` - Update dependencies

See `/SKILL.md` for structure overview and references for Docker and namespace packages.
