---
name: oracle-architect
description: DDD and hexagonal architecture with functional core pattern. Use when designing features, modeling domains, breaking down tasks, or understanding component responsibilities.
user-invocable: false
---

# Architect Skill

## Glossary

Precise vocabulary for every architectural decision. Use these terms exactly — consistency is the point.

- **Module** — anything with an interface and an implementation (function, class, package, layer). Router, Service, Entity, and Repository are all modules.
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config. Not just the type signature.
- **Seam** — where a module's interface lives; a place behaviour can be altered without editing in place. The functional core / effectful edge boundary is the primary seam.
- **Depth** — leverage at the interface. A module is **deep** when a lot of behaviour sits behind a small interface. A module is **shallow** when the interface is nearly as complex as the implementation.
- **Adapter** — a concrete thing satisfying an interface at a seam. A Postgres repository is an adapter; an in-memory fake for testing is another adapter at the same seam.
- **Leverage** — what callers get from depth: more capability per unit of interface they learn.
- **Locality** — what maintainers get from depth: change, bugs, and knowledge concentrate in one place.

Key principles (apply to every decision):

- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test past the interface, the module is probably the wrong shape.
- **One adapter = hypothetical seam. Two adapters = real seam.** Don't introduce a seam unless something actually varies across it.

Domain-Driven Design and hexagonal architecture with functional core pattern for feature design.

## Architecture Model

Unified view of functional core and effectful edge:

```
          Effectful Edge (IO)              Functional Core (Pure)
┌─────────────────────────────────┐    ┌──────────────────────────┐
│  Router    → request parsing    │    │  Service  → orchestration│
│  Consumer  → event handling     │───▶│  Entity   → domain rules │
│  Client    → external APIs      │    │            → validation  │
│  Producer  → event publishing   │◀───│            → transforms  │
│  Repository→ data persistence   │    │                          │
└─────────────────────────────────┘    └──────────────────────────┘
```

**Key Principle:** Business logic lives in the functional core (Service + Entity). IO operations live in the effectful edge. Core defines interfaces; edge implements them (dependency inversion).

## Evaluating Architecture Decisions

Before creating a new module, run these checks:

### Deletion Test

> *Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.*

**When to apply:** Before extracting a new Service, Repository, or utility class.

**Example:**
```
❌ Shallow: OrderFormatterService with 1 method per field
   → Deleting it just moves 6 lines into the Router
   → Interface is as complex as implementation

✅ Deep: OrderService with validate → reserve → save → publish
   → Deleting it replicates orchestration across N handlers
   → Small interface (createOrder), large implementation
```

### Interface as Test Surface

> *Callers and tests cross the same seam. If you want to test past the interface, the module is probably the wrong shape.*

**Implication:**
- Unit tests for Entities test the public interface (validate, transform)
- Unit tests for Services test through the seam with stub repositories
- Integration tests for Repositories test the actual adapter
- If you find yourself testing "internal" methods, the module needs redrawing

### Adapter Rule

> *One adapter = hypothetical seam. Two adapters = real seam.*

**When to apply:** Deciding whether to extract an interface.

**Examples:**
```typescript
// ❌ Hypothetical seam — only one adapter exists
interface IEmailClient { send(email: Email): Promise<void>; }
class SendgridClient implements IEmailClient { ... }
// No second adapter. The interface adds indirection without value.

// ✅ Real seam — two adapters exist
interface IOrderRepository { save(order: Order): Promise<Order>; }
class PostgresOrderRepository implements IOrderRepository { ... }
class InMemoryOrderRepository implements IOrderRepository { ... } // for tests
// The seam earns its keep because callers vary (production vs test).
```

### Depth Check

Prefer deep modules over shallow ones:

| Module | Interface Size | Implementation | Depth |
|--------|--------------|----------------|-------|
| `OrderValidator` | 3 methods (validate, validateItems, validateAddress) | 30 lines each | Shallow |
| `Order` (entity) | 4 methods (fromRequest, toRecord, toResponse, validate) | 200 lines of rules, transforms, invariants | **Deep** |

**Rule of thumb:** A module's interface should hide at least 3x the complexity it exposes.

## Functional Core

Pure, deterministic components containing all business logic.

### Service Layer

**Responsibility:** Orchestrate business operations, coordinate between entities and repositories.

**Characteristics:**
- Pure functions that take data and return results
- No IO operations (database, HTTP, file system)
- Calls repositories through interfaces (dependency injection)
- Composes entity operations into workflows
- Returns success/error results

**Example:**
```typescript
class OrderService {
  async createOrder(request: CreateOrderRequest): Promise<Result<Order>> {
    // Validate with entity
    const order = Order.fromRequest(request);
    const validation = order.validate();
    if (!validation.ok) return validation;

    // Check business rules
    const inventory = await this.inventoryRepo.checkAvailability(order.items);
    if (!inventory.available) return Err('Items not available');

    // Coordinate persistence
    await this.inventoryRepo.reserve(order.items);
    const saved = await this.orderRepo.save(order.toRecord());

    return Ok(Order.fromRecord(saved));
  }
}
```

### Entity Layer

**Responsibility:** Domain models, validation, business rules, data transformations.

**Characteristics:**
- Pure data structures with behavior
- All validation logic
- Data transformations (fromRequest, toRecord, toResponse)
- Business rules and invariants
- No IO, no framework dependencies

**Example:**
```typescript
class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly status: OrderStatus,
    public readonly total: number
  ) {}

  static fromRequest(req: CreateOrderRequest): Order {
    return new Order(
      generateId(),
      req.customerId,
      req.items.map(i => new OrderItem(i)),
      'pending',
      req.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    );
  }

  toRecord(): OrderRecord {
    return {
      id: this.id,
      customer_id: this.customerId,
      items: JSON.stringify(this.items),
      status: this.status,
      total: this.total
    };
  }

  validate(): Result<Order> {
    if (this.items.length === 0) {
      return Err('Order must have at least one item');
    }
    if (this.total < 0) {
      return Err('Order total cannot be negative');
    }
    return Ok(this);
  }

  canCancel(): boolean {
    return ['pending', 'confirmed'].includes(this.status);
  }
}
```

## Effectful Edge

IO-performing components that interact with the outside world.

### Router

**Responsibility:** HTTP request handling, parsing, response formatting.

**Characteristics:**
- Parses HTTP requests into domain types
- Calls service layer with parsed data
- Formats service results into HTTP responses
- Handles HTTP-specific concerns (status codes, headers)
- No business logic

**Example:**
```typescript
router.post('/orders', async (req, res) => {
  const result = await orderService.createOrder(req.body);

  if (result.ok) {
    res.status(201).json(result.value.toResponse());
  } else {
    res.status(400).json({ error: result.error });
  }
});
```

### Repository

**Responsibility:** Data persistence and retrieval.

**Characteristics:**
- Implements data access interface used by services
- Converts between domain entities and database records
- Handles database queries and transactions
- No business logic or validation

**Example:**
```typescript
class OrderRepository {
  async save(record: OrderRecord): Promise<OrderRecord> {
    return await db.orders.create(record);
  }

  async findById(id: string): Promise<OrderRecord | null> {
    return await db.orders.findOne({ id });
  }
}
```

## Component Matrix

Quick reference for where things belong:

| Concern | Component | Layer | Testability |
|---------|-----------|-------|-------------|
| Domain model | Entity | Core | Unit test (pure) |
| Validation | Entity | Core | Unit test (pure) |
| Business rules | Entity | Core | Unit test (pure) |
| Orchestration | Service | Core | Unit test (stub repos) |
| Data transforms | Entity | Core | Unit test (pure) |
| HTTP parsing | Router | Edge | Integration test |
| Data access | Repository | Edge | Integration test |
| External APIs | Client | Edge | Integration test |
| Event handling | Consumer | Edge | Integration test |
| Event publishing | Producer | Edge | Integration test |

## Task Breakdown

### Bottom-Up Dependency Ordering

Implementation order follows dependency chain:

```
1. Entity   → Domain models, validation, transforms
2. Repository → Data access interfaces and implementations
3. Service  → Business logic orchestration
4. Router   → HTTP endpoints
```

**Rationale:** Each layer depends on layers below. Can't implement service without entity, can't implement router without service.

### Task Granularity

**One task per layer:**
- Implement Order entity with validation
- Implement OrderRepository with data access
- Implement OrderService with business logic
- Implement order API endpoints

**For complex features, break down further:**
- Entity: Order, OrderItem, OrderStatus
- Repository: OrderRepository, InventoryRepository
- Service: OrderService, PaymentService
- Router: Order routes, Payment routes

## Architect → Testing Flow

Architectural decisions inform testing strategy:

```
Architect Outputs           →    Testing Inputs
────────────────────────────────────────────────
Component responsibilities  →    What to test
Layer boundaries           →    Where to test
Pure vs effectful          →    Unit vs integration
Entity transformations     →    Property-based tests
Service orchestration      →    Stub-driven tests
```

The testing skill uses architectural structure to determine:
- What gets unit tested (core) vs integration tested (edge)
- Where to place test boundaries
- What to stub and what to test for real
- What test cases validate business rules

## Reference Materials

For detailed patterns and examples:

- **See [references/ddd-patterns.md](references/ddd-patterns.md)** - Aggregates, Value Objects, Domain Events, Bounded Contexts, composition patterns, seam placement
- **See [references/data-modeling.md](references/data-modeling.md)** - Entity design principles, schema patterns, access pattern optimization, data transformation
- **See [references/api-design.md](references/api-design.md)** - REST conventions, request/response contracts, error handling, versioning patterns
- **See [references/interface-design.md](references/interface-design.md)** - Designing module interfaces, "Design It Twice" pattern, depth heuristics, dependency categories, anti-patterns
