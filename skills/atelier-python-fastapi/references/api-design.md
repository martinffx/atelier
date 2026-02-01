# REST API Design Patterns

Best practices for designing clean, consistent RESTful APIs with FastAPI.

## Resource Naming

### Use Nouns, Not Verbs

```python
# ✅ Good: Resource nouns
GET    /users
POST   /users
GET    /users/{id}
PUT    /users/{id}
DELETE /users/{id}

# ❌ Bad: Action verbs
GET    /get-users
POST   /create-user
GET    /get-user-by-id/{id}
```

### Plural Names for Collections

```python
# ✅ Good: Plural for collections
GET /users          # List all users
GET /products       # List all products
GET /orders         # List all orders

# ❌ Bad: Singular
GET /user
GET /product
```

### Nested Resources

```python
# User's orders
GET    /users/{user_id}/orders
POST   /users/{user_id}/orders
GET    /users/{user_id}/orders/{order_id}

# Product reviews
GET    /products/{product_id}/reviews
POST   /products/{product_id}/reviews/{review_id}
```

## HTTP Methods

### CRUD Operations

```python
# Create
POST   /users
{
    "name": "Alice",
    "email": "alice@example.com"
}
# Returns: 201 Created with resource

# Read (list)
GET    /users
# Returns: 200 OK with array

# Read (single)
GET    /users/{id}
# Returns: 200 OK with object

# Update (full replacement)
PUT    /users/{id}
{
    "name": "Alice Updated",
    "email": "alice.updated@example.com"
}
# Returns: 200 OK with updated resource

# Update (partial)
PATCH  /users/{id}
{
    "name": "Alice Updated"
}
# Returns: 200 OK with updated resource

# Delete
DELETE /users/{id}
# Returns: 204 No Content
```

### Method Semantics

**GET** - Read, no side effects, cacheable
- `GET /users` - List users
- `GET /users/{id}` - Get user

**POST** - Create resource, non-idempotent
- `POST /users` - Create user
- `POST /orders` - Create order

**PUT** - Replace resource, idempotent
- `PUT /users/{id}` - Replace user entirely

**PATCH** - Partial update, idempotent
- `PATCH /users/{id}` - Update specific fields

**DELETE** - Delete resource, idempotent
- `DELETE /users/{id}` - Delete user

## Status Codes

### Success Codes

```python
from fastapi import status

# 200 OK - Success with body
@app.get("/users/{id}")
def get_user(id: int):
    ...

# 201 Created - Resource created
@app.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(user: CreateUserRequest):
    ...

# 204 No Content - Success without body
@app.delete("/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: int):
    ...

# 202 Accepted - Async operation accepted
@app.post("/reports", status_code=status.HTTP_202_ACCEPTED)
def generate_report(report: ReportRequest):
    """Report generation started"""
    ...
```

### Client Error Codes

```python
from fastapi import HTTPException

# 400 Bad Request - Invalid input
if not valid_email(email):
    raise HTTPException(
        status_code=400,
        detail="Invalid email format",
    )

# 401 Unauthorized - Not authenticated
if not token:
    raise HTTPException(
        status_code=401,
        detail="Authentication required",
    )

# 403 Forbidden - Authenticated but not authorized
if user.role != "admin":
    raise HTTPException(
        status_code=403,
        detail="Admin access required",
    )

# 404 Not Found - Resource doesn't exist
user = db.get(user_id)
if not user:
    raise HTTPException(
        status_code=404,
        detail="User not found",
    )

# 409 Conflict - Resource conflict
if user_exists(email):
    raise HTTPException(
        status_code=409,
        detail="User with this email already exists",
    )

# 422 Unprocessable Entity - Validation error (Pydantic automatic)
```

### Server Error Codes

```python
# 500 Internal Server Error - Unexpected error
try:
    result = process_data(data)
except Exception as e:
    raise HTTPException(
        status_code=500,
        detail="Internal server error",
    )

# 503 Service Unavailable - Service temporarily down
if not db.is_connected():
    raise HTTPException(
        status_code=503,
        detail="Database unavailable",
    )
```

## Error Responses

### RFC 7807 Problem Details

```python
from pydantic import BaseModel

class ProblemDetail(BaseModel):
    """RFC 7807 Problem Details"""
    type: str  # URI reference to error type
    title: str  # Human-readable summary
    status: int  # HTTP status code
    detail: str  # Human-readable explanation
    instance: str | None = None  # URI reference to specific occurrence

@app.exception_handler(BusinessError)
async def business_error_handler(request: Request, exc: BusinessError):
    return JSONResponse(
        status_code=400,
        content=ProblemDetail(
            type="https://api.example.com/errors/business-error",
            title="Business Rule Violation",
            status=400,
            detail=exc.message,
            instance=request.url.path,
        ).model_dump(),
    )
```

### Validation Errors

```python
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Structured validation errors"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"][1:]),  # Skip 'body'
            "message": error["msg"],
            "type": error["type"],
        })

    return JSONResponse(
        status_code=422,
        content={
            "type": "https://api.example.com/errors/validation",
            "title": "Validation Error",
            "status": 422,
            "errors": errors,
        },
    )
```

## Pagination

### Offset-Based Pagination

```python
from pydantic import BaseModel

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int

@app.get("/users")
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
) -> PaginatedResponse:
    """Offset pagination"""
    skip = (page - 1) * page_size
    limit = page_size

    users = db.query(User).offset(skip).limit(limit).all()
    total = db.query(User).count()
    pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )
```

### Cursor-Based Pagination

Better for large datasets:

```python
class CursorPaginatedResponse(BaseModel):
    items: list
    next_cursor: str | None
    has_more: bool

@app.get("/users")
def list_users(
    cursor: str | None = None,
    limit: int = Query(default=10, ge=1, le=100),
) -> CursorPaginatedResponse:
    """Cursor pagination"""
    query = db.query(User)

    if cursor:
        # Decode cursor (e.g., base64 encoded ID)
        cursor_id = decode_cursor(cursor)
        query = query.filter(User.id > cursor_id)

    users = query.limit(limit + 1).all()
    has_more = len(users) > limit
    items = users[:limit]

    next_cursor = None
    if has_more:
        next_cursor = encode_cursor(items[-1].id)

    return CursorPaginatedResponse(
        items=[UserResponse.model_validate(u) for u in items],
        next_cursor=next_cursor,
        has_more=has_more,
    )
```

## Filtering and Sorting

```python
from typing import Literal

@app.get("/products")
def list_products(
    category: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: Literal["price", "name", "created_at"] = "created_at",
    order: Literal["asc", "desc"] = "desc",
):
    """Filtering and sorting"""
    query = db.query(Product)

    # Filtering
    if category:
        query = query.filter(Product.category == category)
    if min_price:
        query = query.filter(Product.price >= min_price)
    if max_price:
        query = query.filter(Product.price <= max_price)

    # Sorting
    sort_column = getattr(Product, sort)
    if order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    return query.all()
```

## Versioning

### URL Versioning

```python
from fastapi import APIRouter

# Version 1
v1_router = APIRouter(prefix="/v1")

@v1_router.get("/users")
def list_users_v1():
    """V1 implementation"""
    ...

# Version 2
v2_router = APIRouter(prefix="/v2")

@v2_router.get("/users")
def list_users_v2():
    """V2 implementation with new fields"""
    ...

app.include_router(v1_router)
app.include_router(v2_router)
```

### Header Versioning

```python
from fastapi import Header

@app.get("/users")
def list_users(accept_version: str = Header(default="v1", alias="Accept-Version")):
    """Version via header"""
    if accept_version == "v2":
        return list_users_v2()
    return list_users_v1()
```

## HATEOAS (Hypermedia)

Include links to related resources:

```python
class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    links: dict[str, str]

@app.get("/users/{id}")
def get_user(id: int) -> UserResponse:
    user = db.get(User, id)

    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        links={
            "self": f"/users/{user.id}",
            "orders": f"/users/{user.id}/orders",
            "update": f"/users/{user.id}",
            "delete": f"/users/{user.id}",
        },
    )
```

## Idempotency

Ensure same request can be safely retried:

```python
from fastapi import Header
import hashlib

# Idempotency-Key header for POST requests
@app.post("/orders")
def create_order(
    order: CreateOrderRequest,
    idempotency_key: str = Header(),
    db: Session = Depends(get_db),
):
    """Idempotent order creation"""
    # Check if order with this key exists
    existing = db.query(Order).filter(Order.idempotency_key == idempotency_key).first()

    if existing:
        # Return existing order instead of creating duplicate
        return existing

    # Create new order
    new_order = Order(**order.model_dump(), idempotency_key=idempotency_key)
    db.add(new_order)
    db.commit()

    return new_order
```

## Rate Limiting

```python
from fastapi import Request

@app.get("/search")
async def search(
    q: str,
    request: Request,
):
    """Rate limited endpoint"""
    client_ip = request.client.host

    # Check rate limit
    if is_rate_limited(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={"Retry-After": "60"},
        )

    return perform_search(q)
```

## OpenAPI Customization

```python
from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="My API",
        version="1.0.0",
        description="API for my application",
        routes=app.routes,
    )

    # Add custom fields
    openapi_schema["info"]["x-logo"] = {
        "url": "https://example.com/logo.png"
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

## Best Practices

1. **Use standard HTTP methods**: GET, POST, PUT, PATCH, DELETE
2. **Plural resource names**: `/users`, not `/user`
3. **Consistent naming**: lowercase, kebab-case for URLs
4. **Appropriate status codes**: 201 for creation, 204 for deletion
5. **Structured errors**: RFC 7807 Problem Details
6. **Pagination**: Always paginate list endpoints
7. **Versioning**: Plan for API evolution
8. **Idempotency**: Safe retry for mutations
9. **Rate limiting**: Protect against abuse
10. **Documentation**: Use OpenAPI descriptions

## Anti-Patterns

❌ **Verbs in URLs**: `/createUser` instead of `POST /users`
❌ **Custom error formats**: Inconsistent error responses
❌ **No pagination**: Returning unbounded lists
❌ **Wrong status codes**: Returning 200 for errors
❌ **No versioning**: Breaking changes without version
❌ **Ignoring idempotency**: Duplicate requests create duplicates
❌ **No rate limiting**: Vulnerable to abuse

## Summary

**Resource naming:**
- Nouns, not verbs
- Plural for collections
- Nested for relationships

**HTTP methods:**
- GET (read), POST (create), PUT (replace), PATCH (update), DELETE (delete)
- Idempotent: GET, PUT, PATCH, DELETE
- Non-idempotent: POST

**Status codes:**
- 2xx: Success
- 4xx: Client error
- 5xx: Server error

**Pagination:**
- Offset-based (simple)
- Cursor-based (scalable)

**Error handling:**
- Structured errors (RFC 7807)
- Helpful messages
- Consistent format
