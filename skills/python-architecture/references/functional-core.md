# Functional Core / Imperative Shell

The functional core pattern separates pure business logic from side effects, creating highly testable and maintainable code.

## Core Concept

**Functional Core:**
- Pure functions with no side effects
- Deterministic: same input always produces same output
- No IO operations (database, HTTP, files, time, random)
- Easy to test (no mocks needed)
- Business logic and domain rules

**Imperative Shell:**
- Thin layer handling all side effects
- Coordinates external dependencies
- Calls functional core for decisions
- Hard to test (but simple enough to not need testing)

## Pattern Structure

```
┌─────────────────────────────────┐
│     Imperative Shell            │
│  (HTTP, Database, Files, Time)  │
│                                 │
│  ┌───────────────────────────┐  │
│  │   Functional Core         │  │
│  │   (Pure Business Logic)   │  │
│  │   - Calculations          │  │
│  │   - Decisions             │  │
│  │   - Transformations       │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

## Examples

### ❌ Bad: Mixed Concerns

```python
import requests
from datetime import datetime
from database import save_order

def process_order(order_id: str) -> None:
    """Everything mixed together - hard to test"""
    # IO
    response = requests.get(f"/api/orders/{order_id}")
    order_data = response.json()

    # Business logic
    if order_data["total"] > 100:
        discount = 0.1
    else:
        discount = 0

    # More IO
    order_data["discount"] = discount
    order_data["processed_at"] = datetime.now().isoformat()

    # More IO
    save_order(order_data)
```

**Problems:**
- Can't test business logic without HTTP, database, time
- Hard to verify discount calculation
- Slow tests (real IO)
- Unpredictable (depends on current time)

### ✅ Good: Separated Concerns

```python
# ===== Functional Core (pure functions) =====
from decimal import Decimal
from dataclasses import dataclass
from datetime import datetime

@dataclass
class OrderData:
    total: Decimal
    discount: Decimal
    processed_at: datetime

def calculate_discount(total: Decimal) -> Decimal:
    """Pure function - no side effects"""
    if total > 100:
        return Decimal("0.1")
    return Decimal("0")

def apply_discount(order: OrderData, discount: Decimal, processed_at: datetime) -> OrderData:
    """Pure function - returns new data"""
    return OrderData(
        total=order.total * (1 - discount),
        discount=discount,
        processed_at=processed_at
    )

# ===== Imperative Shell (IO coordination) =====
import requests
from database import save_order

def process_order(order_id: str) -> None:
    """Thin shell - just coordinates IO"""
    # IO: fetch data
    response = requests.get(f"/api/orders/{order_id}")
    order_data = response.json()

    # Convert to domain model
    order = OrderData(
        total=Decimal(order_data["total"]),
        discount=Decimal("0"),
        processed_at=datetime.now()  # IO: current time
    )

    # Pure: calculate discount
    discount = calculate_discount(order.total)

    # Pure: apply discount
    processed_order = apply_discount(order, discount, datetime.now())

    # IO: save result
    save_order({
        "total": float(processed_order.total),
        "discount": float(processed_order.discount),
        "processed_at": processed_order.processed_at.isoformat()
    })
```

**Benefits:**
- Test `calculate_discount` with no mocks
- Test `apply_discount` with deterministic inputs
- Shell is simple enough to not need tests
- Fast tests (no real IO)
- Predictable behavior

## Testing Pure Functions

```python
import pytest
from decimal import Decimal

def test_discount_for_large_order():
    """No mocks needed!"""
    result = calculate_discount(Decimal("150"))
    assert result == Decimal("0.1")

def test_no_discount_for_small_order():
    """No setup, no teardown"""
    result = calculate_discount(Decimal("50"))
    assert result == Decimal("0")

def test_apply_discount():
    """Deterministic test"""
    order = OrderData(
        total=Decimal("100"),
        discount=Decimal("0"),
        processed_at=datetime(2024, 1, 1)
    )

    result = apply_discount(
        order,
        Decimal("0.1"),
        datetime(2024, 1, 2)
    )

    assert result.total == Decimal("90")
    assert result.discount == Decimal("0.1")
    assert result.processed_at == datetime(2024, 1, 2)
```

## Identifying Side Effects

Ask these questions:
1. **Does it perform IO?** (Database, HTTP, files, logging)
2. **Does it depend on current time?** (datetime.now(), time.time())
3. **Does it use randomness?** (random.random(), uuid.uuid4())
4. **Does it mutate state?** (list.append(), dict.update())
5. **Does it depend on global state?** (environment variables, config)

If yes to any → **Imperative Shell**
If no to all → **Functional Core**

## Pushing Side Effects to the Edges

### ❌ Bad: Side effects in the middle

```python
def calculate_price(product_id: str) -> Decimal:
    """Pure function name, but has hidden IO"""
    product = db.get_product(product_id)  # Hidden side effect!
    return product.price * Decimal("1.1")
```

### ✅ Good: Accept data as parameter

```python
def calculate_price(product: Product) -> Decimal:
    """Truly pure - takes data, returns result"""
    return product.price * Decimal("1.1")

def get_calculated_price(product_id: str) -> Decimal:
    """Shell function - name reflects IO"""
    product = db.get_product(product_id)  # IO is explicit
    return calculate_price(product)  # Delegates to pure function
```

## Handling Time as a Side Effect

### ❌ Bad: Hidden time dependency

```python
def is_expired(user: User) -> bool:
    """Not pure - depends on current time"""
    return user.expires_at < datetime.now()
```

### ✅ Good: Pass time as parameter

```python
def is_expired(user: User, current_time: datetime) -> bool:
    """Pure - time is explicit parameter"""
    return user.expires_at < current_time

def check_user_expiration(user: User) -> bool:
    """Shell - provides current time"""
    return is_expired(user, datetime.now())
```

## Advanced: Decision/Effect Separation

For complex workflows, separate decisions from effects:

```python
from dataclasses import dataclass
from enum import Enum

class Effect(Enum):
    SEND_EMAIL = "send_email"
    CHARGE_CARD = "charge_card"
    CREATE_ORDER = "create_order"

@dataclass
class Decision:
    """Pure data describing what to do"""
    effects: list[Effect]
    order_data: dict

def decide_order_workflow(cart: Cart, user: User, payment: Payment) -> Decision:
    """Pure function - returns description of effects"""
    effects = []

    if user.requires_verification:
        effects.append(Effect.SEND_EMAIL)

    if payment.amount > 0:
        effects.append(Effect.CHARGE_CARD)

    effects.append(Effect.CREATE_ORDER)

    return Decision(
        effects=effects,
        order_data={"cart": cart, "user": user, "payment": payment}
    )

def execute_order_workflow(cart: Cart, user: User, payment: Payment) -> None:
    """Shell - executes the effects"""
    decision = decide_order_workflow(cart, user, payment)

    for effect in decision.effects:
        if effect == Effect.SEND_EMAIL:
            email_service.send_verification(user.email)
        elif effect == Effect.CHARGE_CARD:
            payment_service.charge(payment.token, payment.amount)
        elif effect == Effect.CREATE_ORDER:
            order_service.create(decision.order_data)
```

**Benefits:**
- Test decisions without executing effects
- Retry-safe (decisions are pure)
- Effects can be logged, audited, replayed

## Guidelines

1. **Start with pure functions**: Write business logic first without IO
2. **Name functions honestly**: `get_user()` implies IO, `calculate_discount()` implies pure
3. **Minimize shell thickness**: Keep imperative shell as thin as possible
4. **Test the core**: Focus tests on functional core (business logic)
5. **Accept data, don't fetch it**: Pure functions take parameters, don't call repositories
6. **Return new data**: Don't mutate, return new values
7. **Make time explicit**: Pass datetime as parameter instead of calling `datetime.now()`

## When to Break the Rules

**Logging**: Acceptable side effect in functional core if:
- Non-invasive (doesn't change behavior)
- Can be disabled/stubbed in tests
- Doesn't affect return value

```python
import logging

logger = logging.getLogger(__name__)

def calculate_discount(total: Decimal) -> Decimal:
    """Logging is acceptable side effect"""
    if total > 100:
        logger.debug(f"Applying discount to order total: {total}")
        return Decimal("0.1")
    return Decimal("0")
```

**Caching**: Acceptable mutation if:
- Implementation detail (doesn't affect observable behavior)
- Transparent to callers
- Doesn't break determinism

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    """Pure function with internal caching"""
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

## Summary

- **Functional Core**: Pure functions, business logic, easy to test
- **Imperative Shell**: IO coordination, thin layer, simple
- **Benefits**: Testability, reliability, maintainability
- **Key insight**: Most bugs are in business logic, not IO - make that testable
