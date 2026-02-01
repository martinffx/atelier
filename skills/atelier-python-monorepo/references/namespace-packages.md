# Namespace Packages (PEP 420)

Namespace packages allow multiple packages to share a common namespace, useful for organizing related libraries in monorepos.

## What is a Namespace Package?

A namespace package is a package that:
- Has no `__init__.py` file at the namespace level
- Can be split across multiple distributions
- Allows import from common namespace

**Traditional package:**
```
my_package/
├── __init__.py  # Makes it a package
└── module.py
```

**Namespace package:**
```
my_namespace/  # No __init__.py!
└── subpackage/
    ├── __init__.py
    └── module.py
```

## Use Case in Monorepos

Group related packages under shared namespace:

```
packages/
├── my-company-core/
│   └── src/
│       └── my_company/  # No __init__.py
│           └── core/
│               └── __init__.py
├── my-company-utils/
│   └── src/
│       └── my_company/  # No __init__.py
│           └── utils/
│               └── __init__.py
└── my-company-db/
    └── src/
        └── my_company/  # No __init__.py
            └── db/
                └── __init__.py
```

**Result:**
```python
from my_company.core import User
from my_company.utils import setup_logging
from my_company.db import Session
```

All under `my_company.*` namespace!

## Package Configuration

**packages/my-company-core/pyproject.toml:**

```toml
[project]
name = "my-company-core"  # Package distribution name (with dash)
version = "0.1.0"
requires-python = ">=3.12"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/my_company"]  # Include entire namespace
```

**packages/my-company-utils/pyproject.toml:**

```toml
[project]
name = "my-company-utils"  # Different distribution name
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "my-company-core",  # Can depend on other namespace packages
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/my_company"]  # Same namespace
```

**Key points:**
- Distribution name: `my-company-core` (with dash)
- Import name: `my_company.core` (with underscore)
- Namespace: `my_company` (no `__init__.py`)
- Subpackage: `core` (has `__init__.py`)

## Directory Structure

### Correct (Namespace Package)

```
packages/my-company-core/
├── pyproject.toml
└── src/
    └── my_company/        # No __init__.py (namespace)
        └── core/           # Has __init__.py (actual package)
            ├── __init__.py
            ├── entities.py
            └── services.py
```

### Incorrect (Not a Namespace)

```
packages/my-company-core/
├── pyproject.toml
└── src/
    └── my_company/
        ├── __init__.py     # ❌ This prevents namespace sharing
        └── core/
            ├── __init__.py
            └── entities.py
```

## Complete Example

### Setup

```
my-monorepo/
├── pyproject.toml (workspace)
└── packages/
    ├── acme-auth/
    │   ├── pyproject.toml
    │   └── src/
    │       └── acme/
    │           └── auth/
    │               ├── __init__.py
    │               └── user.py
    ├── acme-api/
    │   ├── pyproject.toml
    │   └── src/
    │       └── acme/
    │           └── api/
    │               ├── __init__.py
    │               └── routes.py
    └── acme-db/
        ├── pyproject.toml
        └── src/
            └── acme/
                └── db/
                    ├── __init__.py
                    └── repository.py
```

### packages/acme-auth/pyproject.toml

```toml
[project]
name = "acme-auth"
version = "0.1.0"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/acme"]
```

### packages/acme-api/pyproject.toml

```toml
[project]
name = "acme-api"
version = "0.1.0"
dependencies = [
    "acme-auth",  # Depends on namespace sibling
    "fastapi>=0.100.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/acme"]
```

### packages/acme-db/pyproject.toml

```toml
[project]
name = "acme-db"
version = "0.1.0"
dependencies = [
    "acme-auth",  # Depends on namespace sibling
    "sqlalchemy>=2.0.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/acme"]
```

### Usage in Application

```python
# Import from namespace packages
from acme.auth.user import User, authenticate
from acme.api.routes import router
from acme.db.repository import UserRepository

# All under acme.* namespace!
```

## Naming Conventions

**Distribution name** (in `name = "..."`):
- Use dashes: `my-company-core`
- PyPI package name
- What you install: `pip install my-company-core`

**Import name** (in code):
- Use underscores: `my_company.core`
- Python module name
- What you import: `from my_company.core import ...`

**Examples:**

| Distribution Name | Import Path | Namespace | Subpackage |
|------------------|-------------|-----------|------------|
| `acme-auth` | `acme.auth` | `acme` | `auth` |
| `acme-api` | `acme.api` | `acme` | `api` |
| `my-company-core` | `my_company.core` | `my_company` | `core` |
| `my-company-utils` | `my_company.utils` | `my_company` | `utils` |

## Workspace Integration

**Root pyproject.toml:**

```toml
[tool.uv.workspace]
members = [
    "packages/acme-*",  # All acme namespace packages
]
```

**Install all namespace packages:**

```bash
uv sync
```

**Result:**
- All `acme-*` packages installed
- Can import from `acme.*` namespace
- Single lock file for all packages

## Type Checking with Namespace Packages

basedpyright/mypy work automatically with namespace packages:

**pyproject.toml (root):**

```toml
[tool.basedpyright]
typeCheckingMode = "strict"
include = ["packages/*/src"]  # Include all package source
```

No special configuration needed - namespace imports work:

```python
from acme.auth import User  # Type checking works
from acme.api import router  # Autocomplete works
```

## Testing with Namespace Packages

Tests can import from namespace:

```
packages/acme-auth/
├── src/
│   └── acme/
│       └── auth/
│           └── user.py
└── tests/
    └── test_user.py
```

**tests/test_user.py:**

```python
from acme.auth.user import User, authenticate

def test_authenticate():
    user = User(email="test@example.com")
    assert authenticate(user, "password")
```

**Run tests:**

```bash
# From root
uv run pytest packages/acme-auth/tests

# Or specific test
uv run pytest packages/acme-auth/tests/test_user.py
```

## Publishing Namespace Packages

Each namespace package is published independently:

```bash
# Build individual packages
cd packages/acme-auth
uv build

cd ../acme-api
uv build

# Publish to PyPI
uv publish dist/acme_auth-0.1.0-py3-none-any.whl
uv publish dist/acme_api-0.1.0-py3-none-any.whl
```

**Users can install subsets:**

```bash
# Install only auth
pip install acme-auth

# Install auth and API
pip install acme-auth acme-api

# Install all
pip install acme-auth acme-api acme-db
```

## Advantages

1. **Logical grouping**: Related packages under common namespace
2. **Independent versioning**: Each package has its own version
3. **Selective installation**: Install only what you need
4. **Clear organization**: Company/project name as namespace
5. **No conflicts**: Namespace prevents name collisions

## When to Use Namespace Packages

✅ **Use when:**
- Multiple related packages in monorepo
- Want logical grouping under company/project name
- Packages may be installed independently
- Building SDK with multiple modules

❌ **Don't use when:**
- Single package project
- No need for namespace grouping
- All code deployed together (use regular packages)

## Common Pitfalls

### ❌ Adding __init__.py to namespace

```
acme/
├── __init__.py  # ❌ This breaks namespace sharing!
└── auth/
    └── __init__.py
```

This makes `acme` a regular package, not a namespace.

### ❌ Incorrect package configuration

```toml
[tool.hatch.build.targets.wheel]
packages = ["src/acme/auth"]  # ❌ Too specific
```

Should be:
```toml
[tool.hatch.build.targets.wheel]
packages = ["src/acme"]  # ✅ Include entire namespace
```

### ❌ Mixing namespace and regular packages

Don't mix namespace packages with regular packages under same namespace:

```
# ❌ Bad
acme-auth/src/acme/auth/  # Namespace package
acme-api/src/acme/__init__.py  # Regular package - breaks everything
```

## Summary

**Namespace packages:**
- No `__init__.py` at namespace level
- Multiple packages share common namespace
- PEP 420 standard
- Perfect for monorepos

**Configuration:**
- Distribution name: `my-company-core` (dashes)
- Import path: `my_company.core` (underscores)
- `packages = ["src/my_company"]` in pyproject.toml
- No `__init__.py` in namespace directory

**Benefits:**
- Logical organization
- Independent versioning
- Selective installation
- Clear naming
