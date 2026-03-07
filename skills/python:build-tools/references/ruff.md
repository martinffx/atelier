# ruff - Fast Python Linter and Formatter

Rust-based linter and formatter that replaces black, isort, flake8, and pylint. 10-100x faster with auto-fix and formatting capabilities.

## Configuration

Complete `[tool.ruff]` section in pyproject.toml:

```toml
[tool.ruff]
line-length = 100
target-version = "py312"
src = ["src", "tests"]
extend-exclude = [".git", ".venv", "node_modules"]

[tool.ruff.lint]
select = [
    "E",      # pycodestyle errors
    "F",      # pyflakes
    "W",      # pycodestyle warnings
    "I",      # isort (import sorting)
    "N",      # pep8-naming
    "UP",     # pyupgrade
    "RUF",    # Ruff-specific rules
    "B",      # flake8-bugbear
    "C4",     # flake8-comprehensions
    "SIM",    # flake8-simplify
    "PIE",    # flake8-pie
    "RET",    # flake8-return
    "Q",      # flake8-quotes
    "PT",     # flake8-pytest-style
    "LOG",    # flake8-logging
]
ignore = [
    "E501",   # Line too long (handled by formatter)
    "E203",   # Whitespace before punctuation
    "PT004",  # Fixture doesn't return anything
]
extend-safe-fixes = ["PIE794", "RUF100"]

[tool.ruff.lint.per-file-ignores]
"__init__.py" = ["F401"]  # Ignore unused imports in __init__
"tests/*.py" = ["B008"]   # Ignore mutable defaults in tests

[tool.ruff.lint.isort]
known-first-party = ["my_app", "my_service"]
force-single-line = false
combine-as-imports = true

[tool.ruff.lint.flake8-quotes]
docstring-quotes = "double"
inline-quotes = "double"

[tool.ruff.lint.flake8-comprehensions]
allow-dict-calls-with-keyword-arguments = true

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
line-ending = "auto"
docstring-code-format = true
```

## Rules Reference

### Error Categories

- **E/W**: pycodestyle - Style errors and warnings
- **F**: pyflakes - Logic errors
- **I**: isort - Import sorting
- **N**: pep8-naming - Naming conventions
- **UP**: pyupgrade - Modernize code
- **RUF**: Ruff-specific rules

### Common Issues and Fixes

```python
# ✓ Correct: Double quotes
message = "hello"

# ✗ Error: Single quotes (unless docstring)
message = 'hello'

# ✓ Correct: Sorted imports
import asyncio
import os
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import Column, String

# ✗ Error: Unsorted imports
from sqlalchemy import Column
import os
import asyncio

# ✓ Correct: List comprehension
squares = [x**2 for x in range(10)]

# ✗ Error: Using map instead of comprehension (C401)
squares = list(map(lambda x: x**2, range(10)))

# ✓ Correct: Type hints with modern syntax
items: list[str] = ["apple"]
config: dict[str, int] = {}

# ✗ Error: Old-style type hints
items: List[str] = ["apple"]
config: Dict[str, int] = {}
```

## Command Line Usage

```bash
# Check for issues
ruff check .

# Auto-fix issues
ruff check --fix .

# Fix specific file
ruff check --fix src/main.py

# Format code
ruff format .

# Format and check combined
ruff check --fix . && ruff format .

# Check specific rule
ruff check . --select E501

# Ignore specific rule
ruff check . --ignore F841

# Show statistics
ruff check . --statistics

# Generate configuration
ruff config

# Check what would be fixed
ruff check . --diff
```

## Integration Examples

### With pytest

In `pyproject.toml`:

```toml
[tool.ruff.lint]
select = ["PT"]  # Include pytest-style rules

[tool.ruff.lint.flake8-pytest-style]
fixture-parentheses = true
parametrize-names-type = "csv"
parametrize-values-row-type = "tuple"
```

### Pre-commit Hook

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

### GitHub Actions

```yaml
- name: Lint with ruff
  run: ruff check --fix .

- name: Format with ruff
  run: ruff format .

- name: Check format
  run: ruff format --check .
```

## Performance Notes

- Ruff processes entire codebase in ~200ms
- Parallel processing on multi-core systems
- Significantly faster than pycodestyle + isort + black

## Migration from Black/isort

Replace:

```bash
# Old
black src/ && isort src/

# New
ruff format . && ruff check --fix .
```

## Troubleshooting

```bash
# Show which rules are active
ruff rule --all

# Show rule details
ruff rule E501

# Check what ruff would do (dry run)
ruff check . --diff

# Clear cache if issues occur
rm -rf .ruff_cache

# Verbose output
ruff check . -v
```
