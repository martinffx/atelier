---
name: atelier-spec-testing
description: Stub-Driven TDD and layer boundary testing. Use when writing tests, deciding what to test, or testing at component boundaries.
user-invocable: false
---

# Testing Skill

Stub-Driven Test-Driven Development and layer boundary testing for functional core and effectful edge architecture.

## The Iron Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST**

Every line of production code should be written to satisfy a failing test first. This ensures:
- Tests capture actual requirements
- Code is testable by design
- Refactoring has a safety net
- Domain logic is isolated and verifiable

This is non-negotiable. If you're writing code without a failing test, you're not doing TDD—you're just writing code that might work.

## Core Principle: Domain Boundary TDD

Test at the boundaries between components, not inside them. The boundary is where your domain meets the outside world—where IO happens, where other services are called, where users interact.

## Stub-Driven TDD (Legacy Workflow)

Test-Driven Development workflow for the functional core / effectful edge pattern:

```
1. Stub   → Create minimal interface/function signatures
2. Test   → Write tests against stubs
3. Implement → Make tests pass with real implementation
4. Refactor  → Improve code while keeping tests green
```

**Key insight:** Write interface signatures first, test against those, then implement—not the other way around.

See [references/stub-driven-tdd.md] for complete workflow examples.

## Layer Boundary Testing

Test at the boundaries between functional core and effectful edge, not internal implementation. **Domain boundaries define test boundaries**—where your domain logic meets external systems is where you draw the testing line.

```
Test here ──────▼──────────────────▼────── Test here
          Effectful Edge    │    Functional Core
              (stub)        │       (unit test)
```

### Where to Test Each Layer

| Layer | Test Type | What to Stub | What to Assert |
|-------|-----------|--------------|-----------------|
| **Entity** | Unit | Nothing (pure) | Validation, rules, transforms |
| **Service** | Unit | Repositories | Orchestration logic, error handling |
| **Router** | Integration | Service | Status codes, response format |
| **Repository** | Integration | DB connection | CRUD operations, queries |
| **Consumer** | Integration | Service | Event parsing, service calls |

**Key insight:** The domain boundary is your testing contract. Test what crosses the boundary, not what happens inside.

See [references/boundaries.md] for detailed testing patterns by layer.

## Mocking Philosophy

What to mock and what to test for real:

| Situation | Mock | Test for Real |
|-----------|------|---------------|
| External API | ✅ Yes | Response parsing, error handling |
| Database | ✅ Yes | Query logic, transaction handling |
| File system | ✅ Yes | Path handling, file format |
| Events | ✅ Yes | Event routing, payload transforms |
| Repository | ✅ Yes | Service orchestration |
| Entity | ❌ No | Validation, business rules |
| Service logic | ❌ No | Orchestration, edge cases |
| Pure functions | ❌ No | All branches, edge cases |

**Rule:** Mock at domain boundaries, test domain logic for real. If it's inside your domain, test it. If it's outside your domain, mock it.

## Verification Checklist

Before claiming any implementation is complete:

- [ ] All entity tests pass (validation, rules, transforms)
- [ ] All service tests pass (orchestration with stubs)
- [ ] Integration tests pass at boundaries (Router, Repository, Consumer)
- [ ] No tests skipped or commented out
- [ ] Test coverage is strategic (not 100% but covers critical paths)
- [ ] Tests run fast (unit tests < 100ms each)
- [ ] No flaky tests (run 3x to verify)

## Red Flags

**Warning signs your testing is wrong:**

- Tests pass without running (no actual verification)
- 100% coverage but missing critical bugs
- Mocking internal implementation details
- Testing implementation instead of behavior
- Tests that break when refactoring (too coupled)
- No tests at domain boundaries (only at outer edges)
- Tests that require setup in multiple files to understand

**If you see any of these, you're testing wrong. Fix before continuing.**

## When Stuck

**Testing problems and solutions:**

| Problem | Solution |
|---------|----------|
| Can't test because code isn't ready | Stub first, then test against stub |
| Test is flaky | Remove timing dependencies, use deterministic data |
| Mock is complex | You're testing at wrong level—test domain, not infrastructure |
| Tests are slow | Split unit (fast) from integration (slow), run separately |
| Hard to setup | Use test factories/fixtures, share setup in beforeEach |
| Test covers too much | Split into multiple tests at different boundaries |

## Functional Core Testing

### Entity Tests (Pure Functions)

Focus: Validation, business rules, data transformations

```typescript
describe('Order entity', () => {
  describe('validation', () => {
    it('rejects empty items', () => {
      const order = new Order('1', 'C1', [], 'pending', 0);
      expect(order.validate().ok).toBe(false);
    });
  });

  describe('business rules', () => {
    it('prevents cancelling shipped order', () => {
      const order = new Order('1', 'C1', [], 'shipped', 0);
      expect(order.canCancel()).toBe(false);
    });
  });

  describe('transformations', () => {
    it('converts request to entity with calculated total', () => {
      const order = Order.fromRequest({
        customerId: 'C1',
        items: [
          { productId: 'P1', quantity: 2, price: 10 },
          { productId: 'P2', quantity: 1, price: 15 }
        ]
      });
      expect(order.total).toBe(35);
    });
  });
});
```

### Service Tests (Stubbed Dependencies)

Focus: Orchestration logic with stubbed repositories

```typescript
describe('OrderService.createOrder', () => {
  let service: OrderService;
  let mockRepo: OrderRepository;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn().mockResolvedValue({ id: '123' }),
      findById: vi.fn()
    };
    service = new OrderService(mockRepo);
  });

  it('creates order with valid data', async () => {
    const result = await service.createOrder({
      customerId: 'C1',
      items: [{ productId: 'P1', quantity: 2 }]
    });

    expect(result.ok).toBe(true);
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('does not save when validation fails', async () => {
    const result = await service.createOrder({
      customerId: 'C1',
      items: [] // Invalid
    });

    expect(result.ok).toBe(false);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
```

See [references/core-testing.md] for comprehensive Entity and Service examples.

## Effectful Edge Testing

### Router, Repository, Consumer Integration Tests

Focus: Real HTTP/database/events with stubbed core

```typescript
// Router: real HTTP, stub service
describe('POST /orders', () => {
  it('returns 201 for valid request', async () => {
    const mockService = {
      createOrder: vi.fn().mockResolvedValue(Ok({ id: '123' }))
    };
    const app = createApp(mockService);

    const response = await request(app)
      .post('/orders')
      .send({ customerId: 'C1', items: [{ productId: 'P1', quantity: 2 }] });

    expect(response.status).toBe(201);
  });
});

// Repository: real test database
describe('OrderRepository.save', () => {
  it('persists order to database', async () => {
    const repo = new OrderRepository(testDb);
    const saved = await repo.save({
      id: '123',
      customer_id: 'C1',
      items: '[]',
      status: 'pending',
      total: 0
    });

    const found = await testDb.orders.findOne({ id: '123' });
    expect(found).toBeDefined();
  });
});

// Consumer: real events, stub service
describe('OrderConsumer', () => {
  it('handles OrderPlaced event', async () => {
    const mockService = {
      processOrder: vi.fn().mockResolvedValue(Ok({}))
    };
    const consumer = new OrderConsumer(mockService);

    await consumer.handle({
      type: 'OrderPlaced',
      data: { orderId: '123' }
    });

    expect(mockService.processOrder).toHaveBeenCalledWith('123');
  });
});
```

See [references/edge-testing.md] for Router, Repository, Consumer, Producer, and Client patterns.

## Test Coverage Guidelines

Aim for strategic coverage, not 100%:

**High Coverage (Critical):**
- Entity validation and business rules
- Service orchestration logic
- Critical user journeys (integration tests)
- Data transformations with logic

**Medium Coverage (Important):**
- Error handling paths
- Edge cases in business logic
- API contract validation

**Low Coverage (Optional):**
- Simple getters/setters
- Framework boilerplate
- Trivial mappings
- Internal utilities

## What NOT to Test

Avoid testing implementation details, framework behavior, and trivial code:

- Don't test private methods (test through public API)
- Don't test simple getters/setters (no logic = no test value)
- Don't test framework behavior (Express, database driver already tested)
- Don't test third-party library behavior (lodash, validation libraries)
- Don't test trivial mappings without logic

See [references/anti-patterns.md] for anti-patterns with examples and fixes.

## Testing → Implementation Flow

Follow this dependency order:

```
1. Entity tests    (pure functions, fast)
2. Service tests   (stubbed dependencies, fast)
3. Integration tests (real IO, slower)
```

This enables TDD: write tests first at lower layers, then implement, then build upward.

## Quick Reference

**For Entity Testing:** See [references/core-testing.md]
**For Service Testing:** See [references/core-testing.md]
**For Router/Repo/Consumer:** See [references/edge-testing.md]
**For Workflow Examples:** See [references/stub-driven-tdd.md]
**For What NOT to Do:** See [references/anti-patterns.md]
