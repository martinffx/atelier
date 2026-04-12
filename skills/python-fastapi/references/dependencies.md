# Dependency Injection in FastAPI

FastAPI's dependency injection system manages shared resources, authentication, database sessions, and cross-cutting concerns.

## Basic Dependencies

### Function Dependencies

```python
from fastapi import Depends

def get_db():
    """Simple dependency"""
    db = Database()
    try:
        yield db
    finally:
        db.close()

@app.get("/users")
def list_users(db: Database = Depends(get_db)):
    """db injected automatically"""
    return db.query(User).all()
```

### Class Dependencies

```python
class DatabaseSession:
    def __init__(self):
        self.db = Database()

    def __enter__(self):
        return self.db

    def __exit__(self, *args):
        self.db.close()

@app.get("/users")
def list_users(db: Database = Depends(DatabaseSession)):
    return db.query(User).all()
```

## Nested Dependencies

Dependencies can depend on other dependencies:

```python
def get_db():
    db = Database()
    try:
        yield db
    finally:
        db.close()

def get_user_repo(db: Database = Depends(get_db)):
    """Depends on get_db"""
    return UserRepository(db)

@app.get("/users")
def list_users(repo: UserRepository = Depends(get_user_repo)):
    """repo injected with db already provided"""
    return repo.find_all()
```

## Authentication Dependencies

### Token Extraction

```python
from fastapi import Depends, HTTPException, Header

def get_token(authorization: str = Header()):
    """Extract token from header"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return authorization[7:]  # Remove "Bearer " prefix

@app.get("/me")
def get_current_user_profile(token: str = Depends(get_token)):
    user = decode_token(token)
    return user
```

### Current User Dependency

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Database = Depends(get_db),
) -> User:
    """Get authenticated user"""
    token = credentials.credentials

    # Decode token
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

@app.get("/me")
def get_profile(current_user: User = Depends(get_current_user)):
    """current_user injected"""
    return current_user
```

### Optional Authentication

```python
from typing import Optional

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> User | None:
    """Optional authentication"""
    if not credentials:
        return None

    try:
        return decode_and_get_user(credentials.credentials)
    except:
        return None

@app.get("/posts")
def list_posts(current_user: User | None = Depends(get_current_user_optional)):
    """Works with or without authentication"""
    if current_user:
        return get_posts_for_user(current_user)
    return get_public_posts()
```

## Permission Dependencies

```python
from enum import Enum

class Permission(Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"

def require_permission(permission: Permission):
    """Factory function returning dependency"""
    def check_permission(current_user: User = Depends(get_current_user)):
        if permission not in current_user.permissions:
            raise HTTPException(status_code=403, detail="Permission denied")
        return current_user
    return check_permission

# Usage
@app.post("/users")
def create_user(
    user: CreateUserRequest,
    current_user: User = Depends(require_permission(Permission.ADMIN)),
):
    """Requires ADMIN permission"""
    ...

@app.get("/users")
def list_users(
    current_user: User = Depends(require_permission(Permission.READ)),
):
    """Requires READ permission"""
    ...
```

## Database Session Management

### SQLAlchemy Session

```python
from sqlalchemy.orm import Session, sessionmaker

SessionLocal = sessionmaker(bind=engine)

def get_db() -> Session:
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    return db.query(UserModel).all()
```

### With Transaction Management

```python
from contextlib import contextmanager

@contextmanager
def get_db_with_transaction():
    """Database session with automatic transaction"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

@app.post("/users")
def create_user(
    user: CreateUserRequest,
    db: Session = Depends(get_db_with_transaction),
):
    """Transaction automatically committed or rolled back"""
    new_user = UserModel(**user.model_dump())
    db.add(new_user)
    # Commit happens automatically on success
    return new_user
```

## Dependency Classes

Classes can be dependencies:

```python
from fastapi import Depends, HTTPException

class UserService:
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db
        self.repo = UserRepository(db)

    def get_user(self, user_id: int) -> User:
        user = self.repo.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    def create_user(self, data: CreateUserRequest) -> User:
        user = User.from_request(data)
        return self.repo.save(user)

@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    service: UserService = Depends(),
):
    """UserService injected with db already provided"""
    return service.get_user(user_id)
```

## Global Dependencies

Apply dependencies to all routes:

```python
app = FastAPI(dependencies=[Depends(get_current_user)])

# All routes require authentication
@app.get("/users")
def list_users():
    ...

@app.get("/products")
def list_products():
    ...
```

### Router-level Dependencies

```python
router = APIRouter(
    prefix="/admin",
    dependencies=[Depends(require_permission(Permission.ADMIN))],
)

# All routes in this router require ADMIN permission
@router.get("/users")
def list_all_users():
    ...

@router.delete("/users/{user_id}")
def delete_user(user_id: int):
    ...
```

## Caching Dependencies

Use `use_cache=False` to disable dependency caching:

```python
def get_timestamp():
    """Called once per request by default"""
    return datetime.now()

@app.get("/time")
def get_time(
    ts1: datetime = Depends(get_timestamp),
    ts2: datetime = Depends(get_timestamp),
):
    # ts1 and ts2 are the same (cached)
    return {"ts1": ts1, "ts2": ts2}

@app.get("/time-no-cache")
def get_time_no_cache(
    ts1: datetime = Depends(get_timestamp, use_cache=False),
    ts2: datetime = Depends(get_timestamp, use_cache=False),
):
    # ts1 and ts2 are different (not cached)
    return {"ts1": ts1, "ts2": ts2}
```

## Dependency Override (Testing)

Override dependencies in tests:

```python
from fastapi.testclient import TestClient

def get_db_override():
    """Test database"""
    return TestDatabase()

app.dependency_overrides[get_db] = get_db_override

client = TestClient(app)

# Tests use TestDatabase instead of real database
response = client.get("/users")
```

## Query and Path Parameters as Dependencies

```python
from fastapi import Query, Path

def pagination(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
):
    """Pagination dependency"""
    return {"skip": (page - 1) * page_size, "limit": page_size}

@app.get("/users")
def list_users(
    pagination: dict = Depends(pagination),
    db: Session = Depends(get_db),
):
    return db.query(User).offset(pagination["skip"]).limit(pagination["limit"]).all()
```

## Header Dependencies

```python
def verify_api_key(x_api_key: str = Header()):
    """Verify API key from header"""
    if x_api_key != VALID_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

@app.get("/protected")
def protected_route(api_key: str = Depends(verify_api_key)):
    return {"message": "Access granted"}
```

## Cookie Dependencies

```python
from fastapi import Cookie

def get_session(session_id: str | None = Cookie(default=None)):
    """Get session from cookie"""
    if not session_id:
        raise HTTPException(status_code=401, detail="No session")
    session = get_session_from_cache(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    return session

@app.get("/dashboard")
def dashboard(session: Session = Depends(get_session)):
    return {"user": session.user}
```

## Application State Dependencies

```python
from fastapi import Request

def get_redis(request: Request):
    """Access app state"""
    return request.app.state.redis

def get_cache(request: Request):
    return request.app.state.cache

@app.get("/cached")
def get_cached_data(
    cache = Depends(get_cache),
    redis = Depends(get_redis),
):
    ...
```

## Advanced Patterns

### Factory Dependencies

```python
from typing import Type

def create_repository(model: Type):
    """Factory for creating repository dependencies"""
    def get_repository(db: Session = Depends(get_db)):
        return Repository(db, model)
    return get_repository

# Create specific repository dependencies
get_user_repo = create_repository(UserModel)
get_product_repo = create_repository(ProductModel)

@app.get("/users")
def list_users(repo = Depends(get_user_repo)):
    return repo.find_all()
```

### Async Dependencies

```python
async def get_async_db():
    """Async dependency"""
    async with AsyncDatabase() as db:
        yield db

@app.get("/users")
async def list_users(db: AsyncDatabase = Depends(get_async_db)):
    return await db.query(User).all()
```

## Best Practices

1. **Use dependencies for shared resources**: Database, cache, external services
2. **Nest dependencies**: Build complex dependencies from simple ones
3. **Class dependencies for services**: Encapsulate business logic
4. **Factory functions for permissions**: Reusable permission checks
5. **Override in tests**: Swap real dependencies with test doubles
6. **Type hints are required**: FastAPI needs types for injection
7. **Use `yield` for cleanup**: Ensure resources are released

## Summary

**Dependency types:**
- Function dependencies (with `yield` for cleanup)
- Class dependencies (automatic instantiation)
- Nested dependencies (compose from simpler ones)

**Common use cases:**
- Database sessions
- Authentication/authorization
- Pagination parameters
- External service clients
- Caching

**Advanced features:**
- Factory functions (reusable patterns)
- Router/app-level dependencies (global)
- Dependency overrides (testing)
- Async dependencies
