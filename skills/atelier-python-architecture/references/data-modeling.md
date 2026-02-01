# Data Modeling in Python

Modern Python provides multiple tools for data modeling: `dataclasses`, `Pydantic`, and `attrs`. Each has specific use cases.

## When to Use What

**dataclasses** - Domain models and internal data
- Part of standard library (Python 3.7+)
- Fast and lightweight
- Good for internal domain logic
- Use when you control all data

**Pydantic** - API boundaries and validation
- Runtime validation
- JSON schema generation
- OpenAPI integration
- Use at system edges (HTTP requests/responses)

**attrs** - Advanced use cases
- More features than dataclasses
- Validators, converters, evolve
- Use when dataclasses aren't enough

## dataclasses

### Basic Usage

```python
from dataclasses import dataclass
from uuid import UUID
from decimal import Decimal

@dataclass
class Product:
    """Basic dataclass"""
    id: UUID
    name: str
    price: Decimal
    in_stock: bool = True  # Default value
```

**Features:**
- Auto-generated `__init__`, `__repr__`, `__eq__`
- Type hints required
- Default values supported
- Minimal boilerplate

### Immutable dataclasses

Use `frozen=True` for value objects:

```python
@dataclass(frozen=True)
class Money:
    """Immutable value object"""
    amount: Decimal
    currency: str

    def add(self, other: "Money") -> "Money":
        """Return new instance instead of mutating"""
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)

# Immutable - these fail:
# money.amount = 100  # FrozenInstanceError
# money.currency = "EUR"  # FrozenInstanceError
```

### field() for Advanced Configuration

```python
from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4

@dataclass
class Order:
    id: UUID = field(default_factory=uuid4)  # Call function for default
    created_at: datetime = field(default_factory=datetime.now)
    items: list[str] = field(default_factory=list)  # Mutable default
    _internal: str = field(default="", repr=False)  # Exclude from repr
    metadata: dict = field(default_factory=dict, compare=False)  # Exclude from equality
```

**field() parameters:**
- `default`: Static default value
- `default_factory`: Callable for default (use for mutable defaults)
- `init`: Include in `__init__` (default True)
- `repr`: Include in `__repr__` (default True)
- `compare`: Include in `__eq__` (default True)
- `hash`: Include in `__hash__` (default None)

### Validation with __post_init__

```python
@dataclass
class User:
    email: str
    age: int

    def __post_init__(self):
        """Validate after initialization"""
        if "@" not in self.email:
            raise ValueError("Invalid email address")
        if self.age < 0:
            raise ValueError("Age cannot be negative")
        if self.age < 18:
            raise ValueError("User must be at least 18")

# Usage
user = User("test@example.com", 25)  # OK
# User("invalid", 25)  # ValueError: Invalid email address
# User("test@example.com", 15)  # ValueError: User must be at least 18
```

### Computed Fields

```python
@dataclass
class Rectangle:
    width: float
    height: float

    @property
    def area(self) -> float:
        """Computed property"""
        return self.width * self.height

    @property
    def perimeter(self) -> float:
        """Another computed property"""
        return 2 * (self.width + self.height)

rect = Rectangle(width=10, height=5)
print(rect.area)  # 50.0
print(rect.perimeter)  # 30.0
```

### Inheritance

```python
@dataclass
class Person:
    name: str
    age: int

@dataclass
class Employee(Person):
    """Inherits name and age fields"""
    employee_id: str
    salary: Decimal

emp = Employee(name="Alice", age=30, employee_id="E123", salary=Decimal("75000"))
```

## Pydantic

### Basic Models

```python
from pydantic import BaseModel, EmailStr, Field
from decimal import Decimal
from uuid import UUID

class CreateUserRequest(BaseModel):
    """Request validation at API boundary"""
    email: EmailStr  # Validates email format
    age: int = Field(ge=18, le=120)  # Min/max constraints
    name: str = Field(min_length=1, max_length=100)

class UserResponse(BaseModel):
    """Response serialization"""
    id: UUID
    email: str
    name: str
    created_at: str

    model_config = {"from_attributes": True}  # Enable ORM mode
```

**Key features:**
- Runtime validation
- Automatic type coercion
- Rich error messages
- JSON schema generation

### Field Constraints

```python
from pydantic import BaseModel, Field, field_validator
from typing import Annotated

class Product(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: Decimal = Field(gt=0, decimal_places=2)  # Greater than 0, 2 decimals
    quantity: int = Field(ge=0, le=10000)  # Between 0 and 10000
    tags: list[str] = Field(max_length=10)  # Max 10 tags

# Alternative: Annotated types
Price = Annotated[Decimal, Field(gt=0, decimal_places=2)]

class Product(BaseModel):
    name: str
    price: Price  # Reusable constraint
```

### Custom Validators

```python
from pydantic import BaseModel, field_validator, model_validator

class Order(BaseModel):
    items: list[str]
    discount: float

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v):
        """Field validator - validates single field"""
        if not v:
            raise ValueError("Order must have at least one item")
        return v

    @field_validator("discount")
    @classmethod
    def discount_range(cls, v):
        """Validate discount is percentage"""
        if not 0 <= v <= 1:
            raise ValueError("Discount must be between 0 and 1")
        return v

    @model_validator(mode="after")
    def validate_discount_with_items(self):
        """Model validator - validates across fields"""
        if self.discount > 0 and len(self.items) < 2:
            raise ValueError("Discount requires at least 2 items")
        return self
```

### Serialization and Deserialization

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class User(BaseModel):
    id: UUID
    email: str
    created_at: datetime

# From JSON/dict
data = {"id": "123e4567-e89b-12d3-a456-426614174000", "email": "test@example.com", "created_at": "2024-01-01T12:00:00"}
user = User.model_validate(data)  # Pydantic v2
# user = User(**data)  # Alternative

# To dict
user_dict = user.model_dump()

# To JSON
user_json = user.model_dump_json()

# Exclude fields
user_dict = user.model_dump(exclude={"created_at"})

# Include only specific fields
user_dict = user.model_dump(include={"id", "email"})
```

### ORM Integration

```python
from pydantic import BaseModel
from sqlalchemy.orm import Session

class UserResponse(BaseModel):
    id: int
    email: str
    name: str

    model_config = {"from_attributes": True}  # Enable ORM mode

# Convert SQLAlchemy model to Pydantic
def get_user(session: Session, user_id: int) -> UserResponse:
    db_user = session.get(UserModel, user_id)
    return UserResponse.model_validate(db_user)  # Reads from ORM attributes
```

### Nested Models

```python
class Address(BaseModel):
    street: str
    city: str
    country: str

class OrderItem(BaseModel):
    product_id: UUID
    quantity: int
    price: Decimal

class CreateOrderRequest(BaseModel):
    customer_email: EmailStr
    shipping_address: Address  # Nested model
    items: list[OrderItem]  # List of nested models

    @field_validator("items")
    @classmethod
    def validate_items(cls, v):
        if not v:
            raise ValueError("Order must have items")
        return v
```

### Generic Models

```python
from pydantic import BaseModel
from typing import TypeVar, Generic

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic response wrapper"""
    items: list[T]
    total: int
    page: int
    page_size: int

class UserResponse(BaseModel):
    id: int
    email: str

# Type-safe pagination
response = PaginatedResponse[UserResponse](
    items=[UserResponse(id=1, email="test@example.com")],
    total=1,
    page=1,
    page_size=10
)
```

## Entity Transformations

Entities should handle all data transformations.

### Pattern: from_request, to_response, from_record, to_record

```python
from dataclasses import dataclass
from uuid import UUID, uuid4
from decimal import Decimal
from pydantic import BaseModel

# ===== API Layer (Pydantic) =====
class CreateProductRequest(BaseModel):
    name: str
    price: Decimal

class ProductResponse(BaseModel):
    id: UUID
    name: str
    price: Decimal
    in_stock: bool

# ===== Database Layer (SQLAlchemy or similar) =====
@dataclass
class ProductRecord:
    """Database representation"""
    id: UUID
    name: str
    price: Decimal
    in_stock: bool

# ===== Domain Layer (dataclass) =====
@dataclass
class Product:
    """Domain entity with transformation methods"""
    id: UUID
    name: str
    price: Decimal
    in_stock: bool = True

    @classmethod
    def from_request(cls, request: CreateProductRequest) -> "Product":
        """Transform API request → domain entity"""
        return cls(
            id=uuid4(),
            name=request.name,
            price=request.price,
            in_stock=True
        )

    def to_response(self) -> ProductResponse:
        """Transform domain entity → API response"""
        return ProductResponse(
            id=self.id,
            name=self.name,
            price=self.price,
            in_stock=self.in_stock
        )

    @classmethod
    def from_record(cls, record: ProductRecord) -> "Product":
        """Transform database record → domain entity"""
        return cls(
            id=record.id,
            name=record.name,
            price=record.price,
            in_stock=record.in_stock
        )

    def to_record(self) -> ProductRecord:
        """Transform domain entity → database record"""
        return ProductRecord(
            id=self.id,
            name=self.name,
            price=self.price,
            in_stock=self.in_stock
        )
```

**Usage in router:**

```python
from fastapi import APIRouter

router = APIRouter()

@router.post("/products", response_model=ProductResponse)
def create_product(request: CreateProductRequest, service: ProductService):
    """Router handles HTTP, delegates to service"""
    product = Product.from_request(request)  # API → domain
    saved_product = service.create(product)  # Domain logic
    return saved_product.to_response()  # Domain → API
```

**Usage in repository:**

```python
class ProductRepository:
    def save(self, product: Product) -> Product:
        """Repository handles persistence"""
        record = product.to_record()  # Domain → database
        db.save(record)
        return Product.from_record(record)  # Database → domain
```

## Best Practices

### 1. Use dataclasses for Domain Layer

```python
@dataclass
class Order:
    """Internal domain model"""
    id: UUID
    customer_id: UUID
    total: Decimal
    status: str

    def submit(self) -> None:
        """Business logic in entity"""
        if self.status != "draft":
            raise ValueError("Only draft orders can be submitted")
        self.status = "submitted"
```

### 2. Use Pydantic for API Boundaries

```python
class CreateOrderRequest(BaseModel):
    """Validate incoming requests"""
    customer_id: UUID
    items: list[OrderItemRequest]

    @field_validator("items")
    @classmethod
    def validate_items(cls, v):
        if not v:
            raise ValueError("Order must have items")
        return v

class OrderResponse(BaseModel):
    """Serialize responses"""
    id: UUID
    total: Decimal
    status: str
```

### 3. Immutable Value Objects

```python
@dataclass(frozen=True)
class Money:
    """Value objects are immutable"""
    amount: Decimal
    currency: str
```

### 4. Validate in __post_init__ for dataclasses

```python
@dataclass
class User:
    email: str
    age: int

    def __post_init__(self):
        if "@" not in self.email:
            raise ValueError("Invalid email")
        if self.age < 18:
            raise ValueError("Must be 18+")
```

### 5. Keep Transformations in Entities

```python
@dataclass
class Product:
    @classmethod
    def from_request(cls, req: CreateProductRequest) -> "Product":
        """Entity handles transformation"""
        return cls(id=uuid4(), name=req.name, price=req.price)

    def to_response(self) -> ProductResponse:
        """Entity handles serialization"""
        return ProductResponse(id=self.id, name=self.name, price=self.price)
```

## Anti-Patterns

❌ **Using Pydantic everywhere**: Pydantic is for validation, not domain logic
❌ **Mutable value objects**: Value objects must be immutable
❌ **Transformation in service layer**: Entities should handle transformations
❌ **Exposing database models**: Always convert to domain entities
❌ **Validation in service layer**: Validate at boundaries (Pydantic) or in entities

## Summary

**dataclasses:**
- Domain models and internal data
- Lightweight and fast
- `frozen=True` for immutability
- `__post_init__` for validation

**Pydantic:**
- API boundaries (requests/responses)
- Runtime validation
- JSON schema generation
- OpenAPI integration

**Entity transformations:**
- `from_request`: API → domain
- `to_response`: domain → API
- `from_record`: database → domain
- `to_record`: domain → database
