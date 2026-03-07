---
name: atelier-spec-implement
description: Execute implementation plans with TDD workflow. Use when implementing features, executing tasks from a plan, or applying Stub-Driven TDD.
user-invocable: true
---

# Work Skill

Execute implementation plans with TDD workflow.

## Overview

Work executes tasks from a plan using Stub-Driven TDD and Beads tracking.

## The Iron Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST**

Every line of production code should be written to satisfy a failing test first. This ensures:
- Tests capture actual requirements
- Code is testable by design
- Refactoring has a safety net
- Domain logic is isolated and verifiable

This is non-negotiable. If you're writing code without a failing test, you're not doing TDD—you're just writing code that might work.

## Stub-Driven TDD

Test-Driven Development workflow for the functional core / effectful edge pattern:

```
1. Stub   → Create minimal interface/function signatures
2. Test   → Write tests against stubs
3. Implement → Make tests pass with real implementation
4. Refactor  → Improve code while keeping tests green
```

**Key insight:** Write interface signatures first, test against those, then implement—not the other way around.

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

## Execution Flow

1. Read plan from `docs/plans/YYYY-MM-DD-<feature>.md`
2. Find next ready task from Beads: `bd ready --label <feature>`
3. Mark task in_progress: `bd update <task-id> --status in_progress`
4. Execute task with TDD: Stub → Test → Implement → Refactor
5. Verify tests pass
6. Close task: `bd close <task-id> --reason "Implemented with tests"`
7. Repeat until all tasks done

## References

- [Stub-Driven TDD](references/stub-driven-tdd.md)
- [Boundaries](references/boundaries.md)
- [Core Testing](references/core-testing.md)
- [Edge Testing](references/edge-testing.md)
- [Anti-Patterns](references/anti-patterns.md)
