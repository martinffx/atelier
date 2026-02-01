# Pydantic Validation in FastAPI

FastAPI uses Pydantic for request/response validation. Comprehensive validation patterns.

## Field Constraints

### Numeric Constraints

```python
from pydantic import BaseModel, Field
from decimal import Decimal

class Product(BaseModel):
    price: Decimal = Field(gt=0, decimal_places=2)  # Greater than 0, 2 decimals
    discount: float = Field(ge=0, le=1)  # Between 0 and 1
    stock: int = Field(ge=0)  # Greater than or equal to 0
    rating: float = Field(ge=0, le=5)  # Rating from 0 to 5

# Field constraints:
# gt: greater than
# ge: greater than or equal
# lt: less than
# le: less than or equal
# multiple_of: must be multiple of value
# decimal_places: max decimal places
```

### String Constraints

```python
class User(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(pattern=r"^[\w\.\+\-]+@[\w\.\-]+\.\w+$")
    password: str = Field(min_length=8, max_length=100)
    bio: str | None = Field(default=None, max_length=500)

# String constraints:
# min_length: minimum length
# max_length: maximum length
# pattern: regex pattern
```

### Collection Constraints

```python
class Order(BaseModel):
    items: list[str] = Field(min_length=1, max_length=100)  # 1-100 items
    tags: set[str] = Field(max_length=10)  # Max 10 unique tags

# Collection constraints:
# min_length: minimum items
# max_length: maximum items
```

## Field Types

### Special Pydantic Types

```python
from pydantic import BaseModel, EmailStr, HttpUrl, UUID4, constr, conint

class User(BaseModel):
    id: UUID4  # Valid UUID4
    email: EmailStr  # Valid email
    website: HttpUrl  # Valid HTTP URL
    username: constr(min_length=3, max_length=50)  # Constrained string
    age: conint(ge=18, le=120)  # Constrained int

# Install email-validator for EmailStr:
# pip install email-validator
```

### Datetime Types

```python
from datetime import datetime, date, time
from pydantic import BaseModel, Field

class Event(BaseModel):
    name: str
    start_date: date  # YYYY-MM-DD
    start_time: time  # HH:MM:SS
    created_at: datetime  # ISO 8601 datetime

class Appointment(BaseModel):
    scheduled_at: datetime = Field(
        description="Appointment datetime in ISO 8601 format"
    )
```

## Custom Validators

### Field Validators

```python
from pydantic import BaseModel, field_validator

class User(BaseModel):
    email: str
    age: int

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        """Validate email domain"""
        if not v.endswith("@example.com"):
            raise ValueError("Only @example.com emails allowed")
        return v

    @field_validator("age")
    @classmethod
    def validate_age(cls, v):
        """Validate age range"""
        if v < 18:
            raise ValueError("Must be at least 18 years old")
        if v > 120:
            raise ValueError("Age must be realistic")
        return v
```

### Model Validators

Validate across multiple fields:

```python
from pydantic import BaseModel, model_validator

class DateRange(BaseModel):
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_date_range(self):
        """Validate start before end"""
        if self.start_date >= self.end_date:
            raise ValueError("start_date must be before end_date")
        return self

class Order(BaseModel):
    items: list[str]
    discount: float

    @model_validator(mode="after")
    def validate_discount_eligibility(self):
        """Discount requires minimum items"""
        if self.discount > 0 and len(self.items) < 2:
            raise ValueError("Discount requires at least 2 items")
        return self
```

### Transform Values

```python
from pydantic import field_validator

class User(BaseModel):
    email: str
    username: str

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, v):
        """Normalize email to lowercase"""
        return v.lower()

    @field_validator("username")
    @classmethod
    def strip_username(cls, v):
        """Remove whitespace from username"""
        return v.strip()
```

## Complex Validation

### Conditional Validation

```python
from pydantic import BaseModel, model_validator

class Payment(BaseModel):
    method: str  # "card" or "bank"
    card_number: str | None = None
    bank_account: str | None = None

    @model_validator(mode="after")
    def validate_payment_method(self):
        """Validate required fields based on method"""
        if self.method == "card":
            if not self.card_number:
                raise ValueError("card_number required for card payment")
        elif self.method == "bank":
            if not self.bank_account:
                raise ValueError("bank_account required for bank payment")
        else:
            raise ValueError("Invalid payment method")
        return self
```

### List Item Validation

```python
from pydantic import BaseModel, field_validator

class Order(BaseModel):
    items: list[str]

    @field_validator("items")
    @classmethod
    def validate_items(cls, v):
        """Validate each item"""
        if not v:
            raise ValueError("Order must have at least one item")

        # Check for duplicates
        if len(v) != len(set(v)):
            raise ValueError("Duplicate items not allowed")

        # Validate each item
        for item in v:
            if len(item) < 3:
                raise ValueError(f"Item name too short: {item}")

        return v
```

## Nested Models

```python
from pydantic import BaseModel, Field

class Address(BaseModel):
    street: str
    city: str
    country: str = Field(pattern=r"^[A-Z]{2}$")  # Country code

class User(BaseModel):
    name: str
    email: EmailStr
    address: Address  # Nested model

# Request body:
# {
#   "name": "Alice",
#   "email": "alice@example.com",
#   "address": {
#     "street": "123 Main St",
#     "city": "New York",
#     "country": "US"
#   }
# }
```

## Optional Fields

```python
from typing import Optional

class User(BaseModel):
    name: str
    email: str
    bio: str | None = None  # Optional, defaults to None
    age: int | None = None  # Optional
    website: HttpUrl | None = None  # Optional URL

# Or use Optional (older syntax)
class User(BaseModel):
    name: str
    bio: Optional[str] = None
```

## Default Values

```python
from datetime import datetime
from uuid import uuid4

class User(BaseModel):
    id: UUID = Field(default_factory=uuid4)  # Generate new UUID
    created_at: datetime = Field(default_factory=datetime.now)
    is_active: bool = True  # Static default
    role: str = "user"  # Static default
```

## Union Types

```python
from typing import Union
from pydantic import field_validator

class FlexibleField(BaseModel):
    value: int | str  # Can be int or string

    @field_validator("value")
    @classmethod
    def validate_value(cls, v):
        """Validate based on type"""
        if isinstance(v, int):
            if v < 0:
                raise ValueError("Int value must be positive")
        elif isinstance(v, str):
            if len(v) < 3:
                raise ValueError("String value too short")
        return v
```

## Discriminated Unions

For handling multiple types with type field:

```python
from typing import Literal, Union
from pydantic import BaseModel, Field

class CardPayment(BaseModel):
    type: Literal["card"]
    card_number: str
    cvv: str

class BankPayment(BaseModel):
    type: Literal["bank"]
    account_number: str
    routing_number: str

class Payment(BaseModel):
    payment: Union[CardPayment, BankPayment] = Field(discriminator="type")

# FastAPI automatically validates based on "type" field
```

## Custom Error Messages

```python
from pydantic import BaseModel, Field, field_validator, ValidationError

class User(BaseModel):
    age: int = Field(
        ge=18,
        le=120,
        description="User age in years",
    )

    @field_validator("age")
    @classmethod
    def validate_age(cls, v):
        if v < 18:
            raise ValueError("You must be at least 18 years old to register")
        return v

# Customize validation error response in FastAPI
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom validation error format"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"errors": errors},
    )
```

## Reusable Validation

```python
from pydantic import field_validator

def validate_positive(v: int) -> int:
    """Reusable validator"""
    if v <= 0:
        raise ValueError("Must be positive")
    return v

class Product(BaseModel):
    price: int
    stock: int

    _validate_price = field_validator("price")(classmethod(validate_positive))
    _validate_stock = field_validator("stock")(classmethod(validate_positive))
```

## Config Options

```python
from pydantic import BaseModel, ConfigDict

class User(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,  # Strip whitespace from strings
        str_min_length=1,  # Minimum string length
        validate_assignment=True,  # Validate on assignment
        validate_default=True,  # Validate default values
        from_attributes=True,  # Enable ORM mode
    )

    name: str
    email: str
```

## Validation in Route

```python
from fastapi import HTTPException

@app.post("/users")
def create_user(user: CreateUserRequest):
    """Pydantic validation happens automatically"""
    # If validation fails, FastAPI returns 422 with error details
    # If successful, user is validated CreateUserRequest instance

    # Additional business validation
    if user_exists(user.email):
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists",
        )

    return create_user_in_db(user)
```

## Testing Validation

```python
import pytest
from pydantic import ValidationError

def test_valid_user():
    """Test valid user creation"""
    user = CreateUserRequest(
        email="test@example.com",
        name="Test User",
        age=25,
    )
    assert user.email == "test@example.com"

def test_invalid_email():
    """Test invalid email"""
    with pytest.raises(ValidationError) as exc_info:
        CreateUserRequest(
            email="invalid-email",
            name="Test User",
            age=25,
        )
    errors = exc_info.value.errors()
    assert any(error["loc"] == ("email",) for error in errors)

def test_age_validation():
    """Test age must be >= 18"""
    with pytest.raises(ValidationError) as exc_info:
        CreateUserRequest(
            email="test@example.com",
            name="Test User",
            age=15,
        )
    errors = exc_info.value.errors()
    assert "age" in str(errors)
```

## Best Practices

1. **Use Field constraints**: Prefer `Field(gt=0)` over custom validators for simple cases
2. **Descriptive error messages**: Make validation errors helpful
3. **Validate early**: Pydantic validates at API boundary
4. **Normalize data**: Use validators to transform (lowercase email, strip whitespace)
5. **Test validators**: Write tests for complex validation logic
6. **Reuse validators**: Extract common validators to functions
7. **Model validators for cross-field**: Use `@model_validator` when validating multiple fields

## Summary

**Field constraints:**
- Numeric: `gt`, `ge`, `lt`, `le`, `multiple_of`
- String: `min_length`, `max_length`, `pattern`
- Collection: `min_length`, `max_length`

**Validators:**
- `@field_validator`: Validate single field
- `@model_validator`: Validate across fields
- Transform values in validators

**Special types:**
- `EmailStr`: Valid email
- `HttpUrl`: Valid URL
- `UUID4`: Valid UUID

**Error handling:**
- Automatic 422 responses
- Custom error messages
- Exception handlers
