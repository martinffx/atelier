# Interface Design Reference

Patterns for designing module interfaces that maximize depth, leverage, and locality.

Based on "Design It Twice" (Ousterhout) — your first idea is unlikely to be the best.

## Design It Twice

Before committing to a module's interface, sketch at least two alternatives with different trade-offs.

### Process

1. **Frame the problem space**
   - List constraints any interface must satisfy
   - Identify dependencies and which category they fall into
   - Write a rough illustrative code sketch to ground the constraints

2. **Sketch alternatives**
   - Alternative A: Minimize the interface (1–3 entry points max)
   - Alternative B: Maximize flexibility (support many use cases)
   - Alternative C: Optimize for the most common caller (default case trivial)

3. **Compare by depth**
   - Which alternative has the smallest interface for the most behaviour?
   - Which concentrates the most knowledge in one place?
   - Which has the best test surface?

### Example: Order Creation Interface

**Problem:** Design the interface for creating an order.

**Alternative A — Minimal interface:**
```typescript
interface OrderService {
  createOrder(request: CreateOrderRequest): Promise<Result<Order>>;
}
```
- **Pros:** Tiny surface. One seam. Easy to mock.
- **Cons:** All complexity hidden inside. Hard to test partial flows (e.g. validation without persistence).
- **Depth:** Very deep. High leverage, high locality.

**Alternative B — Flexible interface:**
```typescript
interface OrderService {
  validate(request: CreateOrderRequest): Promise<Result<Order>>;
  reserveInventory(order: Order): Promise<Result<Order>>;
  save(order: Order): Promise<Result<Order>>;
  publishEvents(order: Order): Promise<void>;
}
```
- **Pros:** Callers compose their own flows. Easy to test each step.
- **Cons:** Interface is as complex as implementation. Callers must know ordering constraints (reserve before save).
- **Depth:** Shallow. Low leverage — callers replicate orchestration.

**Alternative C — Optimized for common case:**
```typescript
interface OrderService {
  createOrder(request: CreateOrderRequest): Promise<Result<Order>>;
  createOrderDraft(request: CreateOrderRequest): Promise<Result<Order>>; // no inventory check
  confirmOrder(orderId: string): Promise<Result<Order>>; // draft → confirmed
}
```
- **Pros:** Common case (createOrder) is trivial. Draft pattern supports async workflows.
- **Cons:** More surface area than Alternative A. Callers must understand draft vs confirmed.
- **Depth:** Moderate. Good leverage for the common case.

**Recommendation:** Alternative C. It balances depth with real workflow needs. The draft/confirm split is a real seam (two callers: interactive vs batch).

## Interface Size Heuristics

### The Rule of Three

A module's public interface should have no more than 3 primary entry points for each responsibility:

```typescript
// ❌ Too wide
interface OrderService {
  createOrder(...): Promise<Order>;
  updateOrder(...): Promise<Order>;
  deleteOrder(...): Promise<void>;
  getOrder(...): Promise<Order>;
  listOrders(...): Promise<Order[]>;
  searchOrders(...): Promise<Order[]>;
  cancelOrder(...): Promise<Order>;
  shipOrder(...): Promise<Order>;
  refundOrder(...): Promise<Order>;
}

// ✅ Split by responsibility (2 modules, each with ~3 methods)
interface OrderLifecycleService {
  create(...): Promise<Order>;
  cancel(...): Promise<Order>;
  ship(...): Promise<Order>;
}

interface OrderQueryService {
  get(id: string): Promise<Order>;
  list(filters: OrderFilters): Promise<Order[]>;
  search(query: string): Promise<Order[]>;
}
```

### Invariants in the Interface

The interface includes not just types, but everything a caller must know:

```typescript
interface PaymentService {
  // ❌ Interface hides invariants
  processPayment(orderId: string, amount: number): Promise<Receipt>;
  // Caller must discover: amount must match order total, order must be confirmed,
  // can't process twice, throws if payment gateway is down.

  // ✅ Interface encodes invariants in types
  processPayment(
    order: ConfirmedOrder, // type encodes "must be confirmed"
    payment: PaymentMethod  // type encodes valid methods
  ): Promise<Result<Receipt, PaymentError>>;
  // Error mode explicit in return type. Ordering implicit in input types.
```

## Dependency Categories

The shape of an interface depends on what it depends on.

| Category | Description | Interface Impact |
|----------|-------------|------------------|
| **In-process** | Same memory space, no serialization | Can pass rich types, callbacks, streams |
| **Local-substitutable** | Same interface, different implementations (real vs test) | Seam is real. Interface must hide implementation |
| **Ports & adapters** | Crosses a real boundary (DB, HTTP, message queue) | Interface must be narrow. Errors are part of the contract |
| **Mock** | Test-only dependency, no production equivalent | Don't create a seam. Test the real module |

## Common Interface Anti-Patterns

### Leaky Abstraction

```typescript
// ❌ Interface exposes implementation
interface UserRepository {
  query(sql: string, params: any[]): Promise<Row[]>;
}

// ✅ Interface hides implementation
interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<User>;
}
```

### Pass-Through Interface

```typescript
// ❌ Every method delegates 1:1 to another module
class OrderService {
  async findById(id: string) { return this.repo.findById(id); }
  async save(order: Order) { return this.repo.save(order); }
  async delete(id: string) { return this.repo.delete(id); }
}
// Deletion test: delete OrderService → complexity doesn't reappear.
// It's a pass-through. Remove it and call repo directly.
```

### God Interface

```typescript
// ❌ One module does everything
interface PlatformService {
  createUser(...): Promise<User>;
  sendEmail(...): Promise<void>;
  processPayment(...): Promise<Receipt>;
  generateReport(...): Promise<PDF>;
}
// No cohesion. Deleting it would reappear complexity, but in unrelated places.
// Split by domain responsibility instead.
```

### Chatty Interface

```typescript
// ❌ Many small methods that must be called in sequence
interface OrderBuilder {
  setCustomer(customerId: string): this;
  addItem(item: OrderItem): this;
  setShipping(address: Address): this;
  setPayment(method: PaymentMethod): this;
  validate(): Result<void>;
  build(): Order;
}
// Callers must know ordering. State machine hidden in method calls.
// Better: single method that takes a complete request.
```

## Decision Checklist

Before finalizing an interface:

- [ ] Run the deletion test — does complexity reappear across N callers?
- [ ] Check depth — is the interface at least 3x smaller than the implementation?
- [ ] Verify seam — are there at least two adapters?
- [ ] Encode invariants — are error modes, ordering, and constraints visible in types?
- [ ] Test surface — can you test all behaviour through the public interface?
- [ ] Hide details — does the interface leak SQL, HTTP, frameworks, or implementation?
- [ ] Common case — is the most frequent caller's experience trivial?
