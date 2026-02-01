# DDD Patterns Reference

Domain-Driven Design patterns for modeling business domains and enforcing consistency.

## Aggregates

**Definition:** Cluster of domain objects treated as a single unit for data changes

**Rules:**
- One entity is the aggregate root (e.g., Order)
- External references only to the root
- Changes go through the root
- Root enforces invariants

**Example:**
```typescript
class Order {  // Aggregate root
  private items: OrderItem[];  // Part of aggregate

  addItem(item: OrderItem): Result<Order> {
    // Root enforces invariants
    if (this.items.length >= 100) {
      return Err('Order cannot have more than 100 items');
    }
    this.items.push(item);
    return Ok(this);
  }
}
```

**Business Rules Enforcement:**
```typescript
class Order {
  private status: OrderStatus;
  private appliedDiscounts: Discount[] = [];

  applyDiscount(discount: Discount): Result<void> {
    // Business rule: can't apply discount to shipped orders
    if (this.status === 'shipped') {
      return Err('Cannot discount shipped orders');
    }

    // Business rule: no duplicate discounts
    if (this.appliedDiscounts.some(d => d.id === discount.id)) {
      return Err('Discount already applied');
    }

    this.appliedDiscounts.push(discount);
    return Ok(undefined);
  }
}
```

## Value Objects

**Definition:** Immutable objects defined by their attributes, not identity

**Characteristics:**
- No identity (equality by value)
- Immutable
- Self-validating
- Encapsulate validation logic

**Example:**
```typescript
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
    if (!['USD', 'EUR', 'GBP'].includes(currency)) {
      throw new Error('Unsupported currency');
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  static fromCents(cents: number, currency: string): Money {
    return new Money(cents / 100, currency);
  }
}
```

**More Examples:**
```typescript
// Email VO with validation
class Email {
  readonly value: string;

  constructor(value: string) {
    if (!this.isValid(value)) throw new Error('Invalid email');
    this.value = value.toLowerCase();
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

// Address VO with composition
class Address {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly zipCode: string,
    public readonly country: string
  ) {}

  equals(other: Address): boolean {
    return this.street === other.street &&
           this.city === other.city &&
           this.zipCode === other.zipCode &&
           this.country === other.country;
  }
}
```

## Domain Events

**Definition:** Something that happened in the domain that domain experts care about

**Characteristics:**
- Immutable facts about what happened
- Named in past tense
- Include context about what changed
- Timestamped

**Example:**
```typescript
class OrderPlaced {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly total: number,
    public readonly occurredAt: Date
  ) {}
}

// Service publishes events
const order = await orderService.createOrder(request);
await eventBus.publish(
  new OrderPlaced(order.id, order.customerId, order.total, new Date())
);

// Events cross bounded contexts
class OrderShipped {
  constructor(
    public readonly orderId: string,
    public readonly shippingAddress: Address,
    public readonly trackingNumber: string,
    public readonly occurredAt: Date
  ) {}
}
```

**Event-Driven Workflows:**
```typescript
// Order context publishes OrderPlaced
// Inventory context listens and consumes
class InventoryService {
  async handleOrderPlaced(event: OrderPlaced): Promise<Result<void>> {
    // Reserve inventory in response to order
    const result = await this.inventoryRepo.reserve(event.orderId);
    if (!result.ok) {
      // Handle reservation failure
      await this.eventBus.publish(new InventoryReservationFailed(event.orderId));
    }
    return result;
  }
}
```

## Bounded Contexts

**Definition:** Explicit boundaries where a domain model applies

**Guidelines:**
- Each context has its own ubiquitous language
- Contexts communicate via well-defined contracts
- Same concept may have different models in different contexts
- Example: "Customer" in Sales context vs "User" in Auth context

**Context Composition:**
```
Bounded Context: "Orders"
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   Effectful Edge                    Functional Core            │
│   ┌──────────────────┐             ┌──────────────────┐       │
│   │ Router           │────────────▶│ Service          │       │
│   │ POST /orders     │             │ OrderService     │       │
│   └──────────────────┘             └────────┬─────────┘       │
│                                              │                 │
│   ┌──────────────────┐             ┌────────▼─────────┐       │
│   │ Repository       │◀────────────│ Aggregate        │       │
│   │ OrderRepository  │             │ Order (root)     │       │
│   └──────────────────┘             │ └─ OrderItem[]   │       │
│                                    │ └─ Money (VO)    │       │
│   ┌──────────────────┐             └──────────────────┘       │
│   │ Producer         │◀── Domain Event: OrderPlaced           │
│   └────────┬─────────┘                                        │
└────────────│───────────────────────────────────────────────────┘
             │
             ▼ Events cross context boundaries
┌────────────────────────────────────────────────────────────────┐
│ Bounded Context: "Inventory"                                   │
│   Consumer ──▶ InventoryService ──▶ StockLevel (Aggregate)     │
└────────────────────────────────────────────────────────────────┘
```

**Context Anti-Patterns:**
- Shared database (breaks boundary enforcement)
- Generic "core" or "common" domain (pollutes context boundaries)
- Cross-context validation (move validation to appropriate context)
- Tight coupling via shared types (use context-specific DTOs)

## Composition Rules

| DDD Pattern | Maps To | Location |
|-------------|---------|----------|
| Bounded Context | Module/Package boundary | Contains all layers |
| Aggregate | Entity cluster | Functional Core |
| Aggregate Root | Primary Entity | Entity layer |
| Value Object | Immutable type | Entity layer |
| Domain Event | Event class | Published from Service, consumed by edge |
| Repository | Data access | Effectful Edge (interface in Core) |

**Key Interactions:**
1. **Router → Service**: HTTP request parsed, passed to service
2. **Service → Aggregate**: Service orchestrates aggregate operations
3. **Aggregate → Repository**: Service uses repository to persist aggregate
4. **Service → Producer**: Service publishes domain events after state change
5. **Consumer → Service**: Events from other contexts trigger service operations
