# Domain-Driven Design in Python

Domain-Driven Design (DDD) provides patterns for modeling complex business domains and maintaining clean separation of concerns.

## Core Building Blocks

### Entities

Objects with identity that persists over time.

**Characteristics:**
- Has unique identifier (ID)
- Mutable state
- Equality based on ID, not attributes
- Encapsulates business behavior

```python
from dataclasses import dataclass
from uuid import UUID, uuid4
from decimal import Decimal

@dataclass
class Account:
    """Entity - has identity"""
    id: UUID
    owner_id: UUID
    balance: Decimal

    def __eq__(self, other: object) -> bool:
        """Equality based on ID"""
        if not isinstance(other, Account):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        """Hash based on ID"""
        return hash(self.id)

    def deposit(self, amount: Decimal) -> None:
        """Business behavior encapsulated in entity"""
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        self.balance += amount

    def withdraw(self, amount: Decimal) -> None:
        """Enforce business rules"""
        if amount <= 0:
            raise ValueError("Withdrawal amount must be positive")
        if amount > self.balance:
            raise InsufficientFundsError(f"Cannot withdraw {amount} from balance {self.balance}")
        self.balance -= amount
```

### Value Objects

Objects defined entirely by their attributes.

**Characteristics:**
- No identity
- Immutable
- Equality based on all attributes
- Interchangeable

```python
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class Money:
    """Value object - immutable, no identity"""
    amount: Decimal
    currency: str

    def __post_init__(self):
        """Validate on construction"""
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
        if not self.currency:
            raise ValueError("Currency is required")

    def add(self, other: "Money") -> "Money":
        """Return new instance instead of mutating"""
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {other.currency} to {self.currency}")
        return Money(self.amount + other.amount, self.currency)

    def multiply(self, factor: Decimal) -> "Money":
        """All operations return new instances"""
        return Money(self.amount * factor, self.currency)

@dataclass(frozen=True)
class Address:
    """Value object for address"""
    street: str
    city: str
    state: str
    zip_code: str

    def __post_init__(self):
        """Validation ensures value object is always valid"""
        if not self.street or not self.city:
            raise ValueError("Street and city are required")
```

**When to use Entity vs Value Object:**
- Entity: Need to track it over time (User, Order, Product)
- Value Object: Just a measurement or description (Money, Address, DateRange)

### Aggregates

Cluster of entities and value objects treated as a unit.

**Characteristics:**
- Has aggregate root (entry point entity)
- Transaction boundary
- Enforces invariants
- Internal entities accessed only through root

```python
from dataclasses import dataclass, field
from uuid import UUID, uuid4
from decimal import Decimal

@dataclass
class OrderLine:
    """Entity inside aggregate - not aggregate root"""
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Money

    def subtotal(self) -> Money:
        return self.unit_price.multiply(Decimal(self.quantity))

@dataclass
class Order:
    """Aggregate root - controls access to OrderLines"""
    id: UUID
    customer_id: UUID
    lines: list[OrderLine] = field(default_factory=list)
    status: str = "draft"

    def add_line(self, product_id: UUID, quantity: int, unit_price: Money) -> None:
        """Control access through aggregate root"""
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        # Check if product already in order
        for line in self.lines:
            if line.product_id == product_id:
                raise ValueError("Product already in order")

        line = OrderLine(
            id=uuid4(),
            product_id=product_id,
            quantity=quantity,
            unit_price=unit_price
        )
        self.lines.append(line)

    def remove_line(self, line_id: UUID) -> None:
        """Aggregate root enforces invariants"""
        self.lines = [line for line in self.lines if line.id != line_id]

    def total(self) -> Money:
        """Calculated from all lines"""
        if not self.lines:
            return Money(Decimal("0"), "USD")

        total = self.lines[0].subtotal()
        for line in self.lines[1:]:
            total = total.add(line.subtotal())
        return total

    def submit(self) -> None:
        """State transition with validation"""
        if self.status != "draft":
            raise ValueError("Only draft orders can be submitted")
        if not self.lines:
            raise ValueError("Cannot submit empty order")
        self.status = "submitted"
```

**Aggregate Design Rules:**
1. Keep aggregates small (minimize entities inside)
2. Reference other aggregates by ID only
3. Update one aggregate per transaction
4. Use eventual consistency between aggregates

### Repository Pattern

Abstraction for storage and retrieval of aggregates.

**Characteristics:**
- Collection-like interface
- Hides persistence details
- Works with aggregate roots only
- Returns domain objects, not records

```python
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

class OrderRepository(ABC):
    """Abstract repository - defines interface"""

    @abstractmethod
    def get(self, order_id: UUID) -> Optional[Order]:
        """Fetch by ID"""
        pass

    @abstractmethod
    def save(self, order: Order) -> None:
        """Save aggregate"""
        pass

    @abstractmethod
    def delete(self, order_id: UUID) -> None:
        """Remove aggregate"""
        pass

    @abstractmethod
    def find_by_customer(self, customer_id: UUID) -> list[Order]:
        """Query method"""
        pass

    @abstractmethod
    def find_by_status(self, status: str) -> list[Order]:
        """Another query method"""
        pass
```

**Implementation with SQLAlchemy:**

```python
from sqlalchemy.orm import Session

class SqlAlchemyOrderRepository(OrderRepository):
    """Concrete implementation"""

    def __init__(self, session: Session):
        self._session = session

    def get(self, order_id: UUID) -> Optional[Order]:
        """Fetch and convert to domain object"""
        record = self._session.get(OrderRecord, order_id)
        if not record:
            return None
        return self._to_domain(record)

    def save(self, order: Order) -> None:
        """Convert to record and save"""
        record = self._to_record(order)
        self._session.merge(record)
        self._session.commit()

    def delete(self, order_id: UUID) -> None:
        record = self._session.get(OrderRecord, order_id)
        if record:
            self._session.delete(record)
            self._session.commit()

    def find_by_customer(self, customer_id: UUID) -> list[Order]:
        records = self._session.query(OrderRecord).filter_by(customer_id=customer_id).all()
        return [self._to_domain(r) for r in records]

    def find_by_status(self, status: str) -> list[Order]:
        records = self._session.query(OrderRecord).filter_by(status=status).all()
        return [self._to_domain(r) for r in records]

    def _to_domain(self, record: OrderRecord) -> Order:
        """Convert database record to domain object"""
        lines = [
            OrderLine(
                id=line.id,
                product_id=line.product_id,
                quantity=line.quantity,
                unit_price=Money(line.unit_price, line.currency)
            )
            for line in record.lines
        ]
        return Order(
            id=record.id,
            customer_id=record.customer_id,
            lines=lines,
            status=record.status
        )

    def _to_record(self, order: Order) -> OrderRecord:
        """Convert domain object to database record"""
        return OrderRecord(
            id=order.id,
            customer_id=order.customer_id,
            status=order.status,
            lines=[
                OrderLineRecord(
                    id=line.id,
                    product_id=line.product_id,
                    quantity=line.quantity,
                    unit_price=line.unit_price.amount,
                    currency=line.unit_price.currency
                )
                for line in order.lines
            ]
        )
```

### Domain Services

Business logic that doesn't naturally fit in an entity.

**Use when:**
- Operation involves multiple entities
- Behavior doesn't belong to one entity
- Operation is stateless

```python
class TransferService:
    """Domain service - operates on multiple aggregates"""

    def transfer(self, from_account: Account, to_account: Account, amount: Money) -> None:
        """Business logic spanning two aggregates"""
        if from_account.balance < amount.amount:
            raise InsufficientFundsError()

        # Use entity methods
        from_account.withdraw(amount.amount)
        to_account.deposit(amount.amount)
```

**Note:** Domain services are still pure business logic, not application services (which coordinate IO).

### Application Services

Coordinate use cases by orchestrating domain objects and repositories.

```python
class OrderApplicationService:
    """Application service - coordinates use case"""

    def __init__(
        self,
        order_repo: OrderRepository,
        product_repo: ProductRepository,
        customer_repo: CustomerRepository
    ):
        self._order_repo = order_repo
        self._product_repo = product_repo
        self._customer_repo = customer_repo

    def create_order(self, customer_id: UUID, items: list[OrderItemRequest]) -> UUID:
        """Use case: create new order"""
        # Validate customer exists
        customer = self._customer_repo.get(customer_id)
        if not customer:
            raise ValueError("Customer not found")

        # Create order aggregate
        order = Order(id=uuid4(), customer_id=customer_id)

        # Add items
        for item in items:
            product = self._product_repo.get(item.product_id)
            if not product:
                raise ValueError(f"Product {item.product_id} not found")

            order.add_line(
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.price
            )

        # Save aggregate
        self._order_repo.save(order)

        return order.id

    def submit_order(self, order_id: UUID) -> None:
        """Use case: submit order"""
        order = self._order_repo.get(order_id)
        if not order:
            raise ValueError("Order not found")

        # Domain logic
        order.submit()

        # Persist
        self._order_repo.save(order)
```

## Bounded Contexts

Separate models for different parts of the domain.

```python
# ===== Catalog Context =====
@dataclass
class Product:
    """Product in catalog context - focused on display"""
    id: UUID
    name: str
    description: str
    price: Money
    category: str

# ===== Inventory Context =====
@dataclass
class Product:
    """Product in inventory context - focused on stock"""
    id: UUID
    sku: str
    quantity_on_hand: int
    reorder_point: int
    warehouse_location: str

# ===== Order Context =====
@dataclass
class Product:
    """Product in order context - just reference"""
    id: UUID
    name: str
    price: Money
```

**Context Mapping:**
- **Shared Kernel**: Common types shared across contexts
- **Customer/Supplier**: Downstream depends on upstream
- **Anti-Corruption Layer**: Translate between contexts

```python
class CatalogToOrderAdapter:
    """Anti-corruption layer - translates between contexts"""

    def __init__(self, catalog_service: CatalogService):
        self._catalog = catalog_service

    def get_product_for_order(self, product_id: UUID) -> OrderProduct:
        """Translate catalog product to order product"""
        catalog_product = self._catalog.get_product(product_id)
        return OrderProduct(
            id=catalog_product.id,
            name=catalog_product.name,
            price=catalog_product.price
        )
```

## Specifications Pattern

Encapsulate business rules for selection and validation.

```python
from abc import ABC, abstractmethod

class Specification(ABC):
    """Base specification"""

    @abstractmethod
    def is_satisfied_by(self, candidate: Order) -> bool:
        pass

    def and_(self, other: "Specification") -> "Specification":
        return AndSpecification(self, other)

    def or_(self, other: "Specification") -> "Specification":
        return OrSpecification(self, other)

class HighValueOrderSpecification(Specification):
    """Business rule: high value orders"""

    def __init__(self, threshold: Money):
        self._threshold = threshold

    def is_satisfied_by(self, candidate: Order) -> bool:
        return candidate.total().amount >= self._threshold.amount

class ShippedOrderSpecification(Specification):
    """Business rule: shipped orders"""

    def is_satisfied_by(self, candidate: Order) -> bool:
        return candidate.status == "shipped"

# Usage
high_value = HighValueOrderSpecification(Money(Decimal("1000"), "USD"))
shipped = ShippedOrderSpecification()

# Combine specifications
high_value_shipped = high_value.and_(shipped)

if high_value_shipped.is_satisfied_by(order):
    # Apply special handling
    pass
```

## Domain Events

Capture significant occurrences in the domain.

```python
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

@dataclass
class DomainEvent:
    """Base class for domain events"""
    occurred_at: datetime

@dataclass
class OrderSubmitted(DomainEvent):
    """Event: order was submitted"""
    order_id: UUID
    customer_id: UUID
    total: Money

@dataclass
class Order:
    id: UUID
    customer_id: UUID
    lines: list[OrderLine]
    status: str
    events: list[DomainEvent] = field(default_factory=list)

    def submit(self) -> None:
        """Raise domain event when state changes"""
        if self.status != "draft":
            raise ValueError("Only draft orders can be submitted")
        if not self.lines:
            raise ValueError("Cannot submit empty order")

        self.status = "submitted"

        # Raise event
        self.events.append(OrderSubmitted(
            occurred_at=datetime.now(),
            order_id=self.id,
            customer_id=self.customer_id,
            total=self.total()
        ))
```

## Best Practices

1. **Start with the domain**: Model business concepts first, infrastructure later
2. **Ubiquitous language**: Use business terminology in code
3. **Small aggregates**: Minimize entities per aggregate
4. **Reference by ID**: Aggregates reference other aggregates by ID, not object reference
5. **One aggregate per transaction**: Don't update multiple aggregates in single transaction
6. **Eventual consistency**: Use domain events for cross-aggregate updates
7. **Entity behavior**: Put business logic in entities, not services
8. **Immutable value objects**: Always use `frozen=True` for value objects

## Anti-Patterns

❌ **Anemic Domain Model**: Entities with only getters/setters, all logic in services
❌ **God Aggregate**: Aggregate with too many entities
❌ **Cross-Aggregate Transaction**: Updating multiple aggregates in one transaction
❌ **Leaky Repository**: Repository exposing database details
❌ **Service Soup**: Too much logic in services, not enough in entities

## Summary

- **Entities**: Objects with identity and lifecycle
- **Value Objects**: Immutable objects defined by attributes
- **Aggregates**: Transaction boundaries with aggregate root
- **Repositories**: Collection-like interface for aggregates
- **Domain Services**: Business logic spanning multiple entities
- **Application Services**: Use case orchestration with IO
- **Bounded Contexts**: Separate models for different subdomains
