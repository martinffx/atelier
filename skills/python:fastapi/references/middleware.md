# Middleware in FastAPI

Middleware runs before and after each request, useful for cross-cutting concerns like logging, timing, CORS, authentication.

## Built-in Middleware

### CORS Middleware

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],  # Allowed origins
    allow_credentials=True,
    allow_methods=["*"],  # All HTTP methods
    allow_headers=["*"],  # All headers
)

# Development: allow all
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Trusted Host Middleware

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["example.com", "*.example.com"],
)
```

### GZip Middleware

```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

## Custom Middleware

### Function-Based Middleware

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from time import time

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time()

        # Process request
        response = await call_next(request)

        # Add timing header
        process_time = time() - start_time
        response.headers["X-Process-Time"] = str(process_time)

        return response

app.add_middleware(TimingMiddleware)
```

### Request ID Middleware

```python
import uuid
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = str(uuid.uuid4())

        # Add to request state
        request.state.request_id = request_id

        # Process request
        response = await call_next(request)

        # Add to response headers
        response.headers["X-Request-ID"] = request_id

        return response

app.add_middleware(RequestIDMiddleware)

# Access in route
@app.get("/")
def read_root(request: Request):
    request_id = request.state.request_id
    return {"request_id": request_id}
```

## Logging Middleware

```python
import logging
from time import time

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host,
            },
        )

        start_time = time()

        # Process request
        response = await call_next(request)

        # Log response
        process_time = time() - start_time
        logger.info(
            f"Response: {response.status_code}",
            extra={
                "status_code": response.status_code,
                "process_time": process_time,
            },
        )

        return response

app.add_middleware(LoggingMiddleware)
```

## Error Handling Middleware

```python
import traceback
from fastapi.responses import JSONResponse

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            # Log error
            logger.error(
                f"Unhandled exception: {exc}",
                exc_info=True,
                extra={"traceback": traceback.format_exc()},
            )

            # Return error response
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "detail": str(exc),
                },
            )

app.add_middleware(ErrorHandlingMiddleware)
```

## Authentication Middleware

```python
from fastapi import HTTPException

class AuthenticationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip auth for public paths
        if request.url.path in ["/health", "/docs", "/openapi.json"]:
            return await call_next(request)

        # Check auth token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"error": "Missing or invalid authorization header"},
            )

        token = auth_header[7:]  # Remove "Bearer "

        try:
            # Verify token
            user = verify_token(token)
            request.state.user = user
        except Exception:
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid token"},
            )

        return await call_next(request)

app.add_middleware(AuthenticationMiddleware)
```

## Rate Limiting Middleware

```python
from collections import defaultdict
from datetime import datetime, timedelta

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client = request.client.host

        # Clean old timestamps
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.period)
        self.clients[client] = [
            ts for ts in self.clients[client] if ts > cutoff
        ]

        # Check rate limit
        if len(self.clients[client]) >= self.calls:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded"},
            )

        # Record this request
        self.clients[client].append(now)

        return await call_next(request)

app.add_middleware(RateLimitMiddleware, calls=100, period=60)
```

## Database Session Middleware

```python
from sqlalchemy.orm import Session

class DatabaseSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Create session
        db = SessionLocal()
        request.state.db = db

        try:
            response = await call_next(request)
            # Commit on success
            db.commit()
            return response
        except Exception:
            # Rollback on error
            db.rollback()
            raise
        finally:
            db.close()

app.add_middleware(DatabaseSessionMiddleware)

# Access in route
@app.get("/users")
def list_users(request: Request):
    db: Session = request.state.db
    return db.query(User).all()
```

## Middleware Order

Middleware runs in reverse order of addition:

```python
# Execution order: Error → Logging → Timing → CORS → Route

app.add_middleware(CORSMiddleware, ...)       # 4. CORS (innermost)
app.add_middleware(TimingMiddleware)          # 3. Timing
app.add_middleware(LoggingMiddleware)         # 2. Logging
app.add_middleware(ErrorHandlingMiddleware)   # 1. Error (outermost)
```

**Request flow:**
1. ErrorHandlingMiddleware (enter)
2. LoggingMiddleware (enter)
3. TimingMiddleware (enter)
4. CORSMiddleware (enter)
5. Route handler
6. CORSMiddleware (exit)
7. TimingMiddleware (exit)
8. LoggingMiddleware (exit)
9. ErrorHandlingMiddleware (exit)

## Pure ASGI Middleware

For maximum performance, use pure ASGI middleware:

```python
from starlette.types import ASGIApp, Receive, Scope, Send

class SimpleMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Wrap send to modify response
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message["headers"])
                headers.append((b"x-custom-header", b"value"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

app.add_middleware(SimpleMiddleware)
```

## Request State

Share data between middleware and routes:

```python
class ContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Set request state
        request.state.request_id = str(uuid.uuid4())
        request.state.start_time = time()

        response = await call_next(request)

        # Access request state
        duration = time() - request.state.start_time
        response.headers["X-Duration"] = str(duration)

        return response

@app.get("/")
def read_root(request: Request):
    # Access state set by middleware
    request_id = request.state.request_id
    return {"request_id": request_id}
```

## Conditional Middleware

Apply middleware conditionally:

```python
class ConditionalMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip for specific paths
        if request.url.path.startswith("/static"):
            return await call_next(request)

        # Skip for specific methods
        if request.method == "OPTIONS":
            return await call_next(request)

        # Apply middleware logic
        # ...

        return await call_next(request)
```

## Response Modification

Modify response before returning:

```python
class ResponseModificationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response

app.add_middleware(ResponseModificationMiddleware)
```

## Testing Middleware

```python
from fastapi.testclient import TestClient

def test_timing_middleware():
    client = TestClient(app)
    response = client.get("/")

    assert "X-Process-Time" in response.headers
    assert float(response.headers["X-Process-Time"]) > 0

def test_request_id_middleware():
    client = TestClient(app)
    response = client.get("/")

    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) == 36  # UUID length
```

## Best Practices

1. **Order matters**: Add middleware in correct order (error handling first)
2. **Use request.state**: Share data between middleware and routes
3. **Handle errors**: Catch exceptions in middleware
4. **Performance**: Keep middleware fast (runs on every request)
5. **Skip when needed**: Don't apply to health checks, static files
6. **Type hints**: Use proper types for Request, Response
7. **Pure ASGI for performance**: Use ASGI middleware for hot paths

## Common Middleware Stack

Recommended middleware order:

```python
# 1. Error handling (outermost)
app.add_middleware(ErrorHandlingMiddleware)

# 2. Logging
app.add_middleware(LoggingMiddleware)

# 3. Timing
app.add_middleware(TimingMiddleware)

# 4. Rate limiting
app.add_middleware(RateLimitMiddleware)

# 5. Authentication
app.add_middleware(AuthenticationMiddleware)

# 6. Database session
app.add_middleware(DatabaseSessionMiddleware)

# 7. CORS (innermost)
app.add_middleware(CORSMiddleware, ...)
```

## Summary

**Built-in middleware:**
- CORSMiddleware (cross-origin requests)
- TrustedHostMiddleware (host validation)
- GZipMiddleware (compression)

**Custom middleware:**
- Timing (performance monitoring)
- Logging (request/response logging)
- Error handling (catch all exceptions)
- Authentication (verify tokens)
- Rate limiting (prevent abuse)

**Key concepts:**
- Middleware runs on every request
- Order matters (reverse order of addition)
- Use `request.state` for sharing data
- Keep middleware fast
