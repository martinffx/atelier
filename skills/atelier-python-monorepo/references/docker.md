# Docker Builds for Python Workspaces

Optimized Docker builds for Python monorepos using uv workspaces.

## Basic Multi-Stage Build

**apps/api/Dockerfile:**

```dockerfile
# Build stage - install dependencies
FROM python:3.12-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy workspace configuration
COPY pyproject.toml uv.lock ./

# Copy all packages (needed for workspace dependencies)
COPY packages/ ./packages/

# Copy this app
COPY apps/api/ ./apps/api/

# Install dependencies into .venv
RUN uv sync --frozen --no-dev --package my-api

# Runtime stage - minimal image
FROM python:3.12-slim

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy source code
COPY --from=builder /app/apps/api /app/apps/api
COPY --from=builder /app/packages /app/packages

# Add .venv to PATH
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Run application
CMD ["python", "-m", "my_api.main"]
```

**Benefits:**
- Multi-stage: build stage separate from runtime
- Smaller final image (no build tools)
- Cached layers (dependencies cached separately)

## Layer Caching Optimization

Optimize Docker layer caching by copying files in dependency order:

```dockerfile
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Step 1: Copy lock files (changes rarely)
COPY pyproject.toml uv.lock ./

# Step 2: Copy package metadata only (for dependency resolution)
COPY packages/core/pyproject.toml ./packages/core/
COPY packages/utils/pyproject.toml ./packages/utils/
COPY apps/api/pyproject.toml ./apps/api/

# Step 3: Install dependencies (cached if pyproject.toml unchanged)
RUN uv sync --frozen --no-dev --package my-api

# Step 4: Copy source code (changes frequently)
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Runtime stage
FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/apps/api /app/apps/api
COPY --from=builder /app/packages /app/packages

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

CMD ["python", "-m", "my_api.main"]
```

**Why this works:**
- Dependencies change less frequently than code
- Docker caches layers from top to bottom
- Copying `pyproject.toml` before source code means dependency install is cached

## Build from Monorepo Root

Build all apps from root with build context:

**Root docker-compose.yml:**

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/mydb

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    environment:
      - REDIS_URL=redis://redis:6379

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=postgres

  redis:
    image: redis:7
```

**Key points:**
- `context: .` - Build from monorepo root
- `dockerfile: apps/api/Dockerfile` - Dockerfile location
- All apps can access packages/

## Development vs Production Builds

### Development Build

Include dev dependencies and enable hot reload:

```dockerfile
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install with dev dependencies
RUN uv sync --frozen --package my-api

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Development server with reload
CMD ["uvicorn", "my_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**docker-compose.dev.yml:**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile.dev
    volumes:
      - ./apps/api:/app/apps/api  # Mount source for hot reload
      - ./packages:/app/packages
    ports:
      - "8000:8000"
```

### Production Build

Multi-stage, no dev dependencies, optimized:

```dockerfile
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Production: no dev dependencies
RUN uv sync --frozen --no-dev --package my-api

FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/apps/api /app/apps/api
COPY --from=builder /app/packages /app/packages

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Production server
CMD ["uvicorn", "my_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Building Specific Packages Only

If app only needs subset of workspace packages:

```dockerfile
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./

# Copy only required packages
COPY packages/core/ ./packages/core/
COPY packages/utils/ ./packages/utils/
# Don't copy packages/other (not needed)

COPY apps/api/ ./apps/api/

RUN uv sync --frozen --no-dev --package my-api

FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/apps/api /app/apps/api
COPY --from=builder /app/packages/core /app/packages/core
COPY --from=builder /app/packages/utils /app/packages/utils

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

CMD ["python", "-m", "my_api.main"]
```

## .dockerignore

Create `.dockerignore` at root to exclude unnecessary files:

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.venv/
*.egg-info/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Testing
.pytest_cache/
.coverage
htmlcov/

# Build
dist/
build/

# Git
.git/
.gitignore

# Documentation
docs/
*.md

# CI/CD
.github/
.gitlab-ci.yml

# Environment
.env
.env.*
```

## Health Checks

Add health check to Dockerfile:

```dockerfile
FROM python:3.12-slim

# ... (previous steps)

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

CMD ["uvicorn", "my_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Or in docker-compose:

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

## Non-Root User

Run container as non-root for security:

```dockerfile
FROM python:3.12-slim

# ... (builder stage)

FROM python:3.12-slim

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv
COPY --from=builder --chown=appuser:appuser /app/apps/api /app/apps/api
COPY --from=builder --chown=appuser:appuser /app/packages /app/packages

# Switch to non-root user
USER appuser

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

CMD ["uvicorn", "my_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Build Arguments

Parameterize builds with ARG:

```dockerfile
FROM python:3.12-slim AS builder

ARG APP_NAME=my-api
ARG APP_VERSION=0.1.0

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY packages/ ./packages/
COPY apps/${APP_NAME}/ ./apps/${APP_NAME}/

RUN uv sync --frozen --no-dev --package ${APP_NAME}

FROM python:3.12-slim

ARG APP_NAME=my-api

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/apps/${APP_NAME} /app/apps/${APP_NAME}
COPY --from=builder /app/packages /app/packages

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

CMD ["python", "-m", "${APP_NAME}.main"]
```

Build with:

```bash
docker build --build-arg APP_NAME=my-api -t my-api:latest -f apps/my-api/Dockerfile .
```

## Shared Dockerfile

Single Dockerfile for all apps:

**Dockerfile.workspace:**

```dockerfile
ARG PYTHON_VERSION=3.12

FROM python:${PYTHON_VERSION}-slim AS builder

ARG APP_NAME
ARG APP_PATH=apps/${APP_NAME}

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY packages/ ./packages/
COPY ${APP_PATH}/ ./${APP_PATH}/

RUN uv sync --frozen --no-dev --package ${APP_NAME}

FROM python:${PYTHON_VERSION}-slim

ARG APP_NAME
ARG APP_PATH=apps/${APP_NAME}

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/${APP_PATH} /app/${APP_PATH}
COPY --from=builder /app/packages /app/packages

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

CMD ["python", "-m", "${APP_NAME}.main"]
```

**docker-compose.yml:**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.workspace
      args:
        APP_NAME: my-api
    ports:
      - "8000:8000"

  worker:
    build:
      context: .
      dockerfile: Dockerfile.workspace
      args:
        APP_NAME: my-worker
```

## CI/CD Build Example

**GitHub Actions:**

```yaml
name: Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [api, worker]

    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: |
          docker build \
            --build-arg APP_NAME=my-${{ matrix.app }} \
            -t myregistry/my-${{ matrix.app }}:${{ github.sha }} \
            -t myregistry/my-${{ matrix.app }}:latest \
            -f apps/my-${{ matrix.app }}/Dockerfile \
            .

      - name: Push image
        run: |
          docker push myregistry/my-${{ matrix.app }}:${{ github.sha }}
          docker push myregistry/my-${{ matrix.app }}:latest
```

## Summary

**Best practices:**
- Multi-stage builds for smaller images
- Layer caching (copy lock files before source)
- Build from monorepo root
- Use .dockerignore
- Run as non-root user
- Add health checks
- Separate dev and prod Dockerfiles
- Use build args for flexibility

**Key patterns:**
- Copy workspace packages for dependencies
- Use `uv sync --frozen --no-dev --package <name>`
- Set PYTHONPATH for workspace imports
- Include .venv in PATH
