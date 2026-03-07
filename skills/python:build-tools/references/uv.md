# uv - Fast Python Package Manager

Rust-based Python package manager that replaces pip, pip-tools, and virtualenv. 10-100x faster than pip with full pip and setuptools compatibility.

## Installation

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Project Setup

```bash
# Create new project with uv template
uv init my-project
cd my-project

# Initialize uv in existing project
uv init

# Install Python version
uv python install 3.12

# Install dependencies
uv sync

# Add dependencies
uv add fastapi pydantic

# Add dev dependencies
uv add --dev pytest ruff basedpyright

# Remove dependency
uv remove fastapi
```

## Running Commands

```bash
# Run Python script
uv run python script.py

# Run module
uv run python -m my_module

# Run installed tool (no venv activation needed)
uv run pytest
uv run ruff check .
uv run basedpyright

# Run with specific Python version
uv run --python 3.12 python script.py

# Run script in context with venv
uv run python -c "import fastapi; print(fastapi.__version__)"
```

## Dependency Management

```bash
# Update all dependencies
uv lock --upgrade

# Update specific package
uv lock --upgrade-package fastapi

# Show dependency tree
uv tree

# Export requirements.txt
uv pip compile pyproject.toml -o requirements.txt

# Sync after manual pyproject.toml edits
uv sync

# Sync and skip lock file update
uv sync --frozen

# Reinstall all
uv sync --reinstall
```

## Workspace Configuration

For monorepos with multiple packages:

```toml
[workspace]
members = ["packages/core", "packages/api", "packages/cli"]

[project]
name = "monorepo"
version = "0.1.0"

[tool.uv.workspace]
exclude = ["docs"]
```

Then within each member:

```toml
[project]
name = "core"
version = "0.1.0"
dependencies = []

[project.optional-dependencies]
dev = ["pytest>=8.0.0"]
```

## Scripts in pyproject.toml

```toml
[tool.uv.scripts]
dev = "uvicorn my_app.main:app --reload"
migrate = "alembic upgrade head"
test = "pytest tests/"
lint = "ruff check ."
format = "ruff format ."
typecheck = "basedpyright"
check = { chain = ["lint", "format", "typecheck", "test"] }
```

Run scripts:

```bash
uv run dev
uv run migrate
uv run test
uv run check  # Runs all checks in sequence
```

## Version Pinning

Specify exact versions in pyproject.toml:

```toml
dependencies = [
    "fastapi>=0.100.0,<1.0.0",
    "pydantic==2.0.0",
    "sqlalchemy>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-cov>=5.0.0",
    "ruff>=0.8.0",
    "basedpyright>=1.0.0",
]
```

The lock file (`uv.lock`) records exact versions used.

## Environment Variables

Create `.env` file in project root:

```bash
DATABASE_URL="postgresql://user:pass@localhost/mydb"
PYTHONPATH="src"
LOG_LEVEL="INFO"
```

Load in Python:

```python
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
```

Or use `python-dotenv`:

```bash
uv add python-dotenv
```

## Advanced Options

### Custom Index

```toml
[tool.uv]
index-url = "https://pypi.org/simple"
extra-index-urls = ["https://test.pypi.org/simple"]
```

### Dev Dependencies Separation

```toml
[project]
dependencies = ["fastapi>=0.100.0"]

[project.optional-dependencies]
dev = ["pytest>=8.0.0", "ruff>=0.8.0"]
test = ["pytest>=8.0.0"]
docs = ["sphinx>=6.0.0"]

[tool.uv]
dev-dependencies = [
    "pytest>=8.0.0",
    "ruff>=0.8.0",
    "basedpyright>=1.0.0",
]
```

### Constraints File

Use constraints.txt to pin versions without changing dependencies:

```bash
# constraints.txt
sqlalchemy==2.0.0
pydantic==2.5.0
```

Apply constraints:

```bash
uv pip compile pyproject.toml --constraint constraints.txt -o requirements.txt
```

## Performance

uv is 10-100x faster because it:
- Written in Rust (native performance)
- Parallel dependency resolution
- Intelligent caching
- Compiled wheels by default
- Local disk cache

Typical project:
- pip: 30-60 seconds
- uv: 1-5 seconds

## Troubleshooting

```bash
# Clear cache
uv cache clean

# Verbose output
uv sync -v

# Check Python installation
uv python list

# Update uv itself
uv self update

# Check project structure
uv tree
uv tree --depth 2
```
