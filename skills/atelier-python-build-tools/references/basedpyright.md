# basedpyright - Strict Type Checking

Fast type checker forked from pyright with improved performance and stricter defaults. Recommended for production Python codebases.

## Configuration

Complete `[tool.basedpyright]` section in pyproject.toml:

```toml
[tool.basedpyright]
typeCheckingMode = "strict"
pythonVersion = "3.12"
pythonPlatform = "Linux"

# Paths
include = ["src", "tests"]
exclude = ["**/__pycache__", ".venv", "build", "dist"]
ignore = []
typeshedPath = ""
stubPath = ""

# Reporting
reportMissingImports = true
reportMissingTypeStubs = false
reportMissingModuleSource = true
reportUndefinedVariable = true
reportPrivateUsage = false
reportGeneralTypeIssues = true
reportOptionalMemberAccess = true
reportOptionalSubscript = true
reportOptionalCall = true
reportOptionalIterable = true
reportOptionalContextManager = true
reportOptionalOperand = true
reportOptionalTypeArg = true
reportUnusedImport = true
reportUnusedClass = true
reportUnusedFunction = true
reportUnusedVariable = true
reportDuplicateImport = true
reportIncompatibleMethodOverride = true
reportIncompatibleVariableOverride = true
reportAssignmentType = true
reportReturnType = true

# Lenient mode (use sparingly)
reportIncompatibleMethodOverride = "warning"
reportOptionalMemberAccess = "warning"
```

## Type Checking Modes

- **off**: No type checking
- **basic**: Basic type checking (fastest)
- **standard**: Standard type checking (default)
- **strict**: Strict type checking (recommended for production)

Recommend `strict` for new projects. For existing codebases, start with `basic` and incrementally increase.

## Common Type Patterns

### Basic Types

```python
from typing import Optional, Union, Any
from decimal import Decimal

# Basic types
name: str = "Alice"
age: int = 30
price: float = 19.99
decimal_price: Decimal = Decimal("19.99")
is_active: bool = True

# Collections
items: list[str] = ["apple", "banana"]
mapping: dict[str, int] = {"count": 5}
unique: set[str] = {"a", "b", "c"}
coords: tuple[int, int] = (10, 20)

# Optional (value or None)
nickname: Optional[str] = None
nickname = "Bob"  # OK

# Union (multiple types)
value: Union[int, str] = 42
value = "text"  # OK

# Generic unknown
data: Any = {"key": "value"}  # Avoid when possible
```

### Functions

```python
def calculate_discount(
    total: Decimal,
    rate: Optional[Decimal] = None
) -> Decimal:
    """Calculate discount amount."""
    if rate is None:
        rate = Decimal("0.1")
    return total * rate

def process_items(items: list[str]) -> None:
    """Process items - no return value."""
    for item in items:
        print(item)

def get_or_default(value: Optional[str]) -> str:
    """Return value or default."""
    return value or "default"
```

### Classes

```python
from dataclasses import dataclass

@dataclass
class User:
    """User entity with type hints."""
    id: int
    name: str
    email: str
    age: Optional[int] = None

    def validate(self) -> None:
        """Validate user data."""
        if not self.name:
            raise ValueError("Name required")
        if self.age is not None and self.age < 0:
            raise ValueError("Age must be positive")

    @property
    def is_adult(self) -> bool:
        """Check if adult."""
        if self.age is None:
            return False
        return self.age >= 18

    def __str__(self) -> str:
        return f"{self.name} ({self.email})"
```

### Generics

```python
from typing import Generic, TypeVar

T = TypeVar("T")

class Container(Generic[T]):
    """Generic container."""
    def __init__(self, item: T) -> None:
        self.item = item

    def get(self) -> T:
        return self.item

# Usage
int_container: Container[int] = Container(42)
value: int = int_container.get()

str_container: Container[str] = Container("hello")
text: str = str_container.get()
```

### Protocol (Structural Typing)

```python
from typing import Protocol

class Logger(Protocol):
    """Logger protocol."""
    def log(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...

class ConsoleLogger:
    """Implements Logger protocol."""
    def log(self, message: str) -> None:
        print(f"INFO: {message}")

    def error(self, message: str) -> None:
        print(f"ERROR: {message}")

def use_logger(logger: Logger) -> None:
    """Use any logger that implements protocol."""
    logger.log("Starting")
    logger.error("Something failed")

# ConsoleLogger satisfies Logger protocol
use_logger(ConsoleLogger())
```

## Commands

```bash
# Type check entire project
basedpyright

# Type check specific file
basedpyright src/main.py

# Type check specific directory
basedpyright src/

# Verbose output
basedpyright --verbose

# Show warnings
basedpyright --warnings

# Output format
basedpyright --outputjson

# Type checking statistics
basedpyright --stats

# Configuration
basedpyright --configfile custom.toml
```

## Integration

### With VS Code

Install extension: Pylance or Basedpyright (by Bazel)

Add to `.vscode/settings.json`:

```json
{
    "python.linting.enabled": true,
    "[python]": {
        "editor.defaultFormatter": "charliermarsh.ruff",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.organizeImports": "explicit"
        }
    },
    "basedpyright.typeCheckingMode": "strict"
}
```

### Pre-commit Hook

Add to `.pre-commit-config.yaml`:

```yaml
- repo: local
  hooks:
    - id: basedpyright
      name: basedpyright
      entry: basedpyright
      language: system
      types: [python]
      require_serial: true
```

### GitHub Actions

```yaml
- name: Type check with basedpyright
  run: basedpyright
```

## Common Issues

### Missing Type Stubs

Install type stubs for third-party packages:

```bash
uv add --dev types-requests types-pyyaml types-click
```

### Ignoring Type Errors

```python
# Ignore entire line
value: int = some_string_func()  # type: ignore

# Ignore specific error
value: int = some_string_func()  # type: ignore[assignment]
```

Use sparingly - type hints should be fixed, not ignored.

### Strict Mode Challenges

If strict mode is too strict, consider:

1. Using `type: ignore` for legacy code
2. Starting with `standard` mode and gradually increasing strictness
3. Configuring `reportPrivateUsage = false` for internal APIs
4. Excluding test code: `exclude = ["tests"]`

## Performance

Basedpyright is 2-5x faster than mypy on large codebases.

Typical project:
- mypy: 10-30 seconds
- basedpyright: 2-10 seconds

## Troubleshooting

```bash
# Clear cache
rm -rf .basedpyright

# Verbose error messages
basedpyright --verbose

# Check configuration
basedpyright --showconfig

# Update tool
uv add --upgrade basedpyright
```
