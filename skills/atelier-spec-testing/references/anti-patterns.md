# Testing Anti-Patterns

What NOT to test and why. Common testing mistakes with examples.

## Testing Implementation Details

Testing internal implementation forces refactors to update tests, even when behavior doesn't change.

### Anti-Pattern: Testing Private Methods

```typescript
// ❌ DON'T: Test private methods
class OrderService {
  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  async createOrder(request: CreateOrderRequest): Promise<Result<Order>> {
    const total = this.calculateTotal(request.items);
    // ...
  }
}

// Test tries to call private method - won't compile
describe('OrderService', () => {
  it('calculates total correctly', () => {
    const service = new OrderService();
    // Can't call private calculateTotal!
    const total = service['calculateTotal']([...]);
    expect(total).toBe(35);
  });
});
```

**Problem:**
- Can't directly test private methods
- Forced to use `service['calculateTotal']()` hack
- Breaking refactors: rename or move the method, test breaks

**Solution:** Test through public method

```typescript
// ✓ DO: Test behavior through public method
describe('OrderService.createOrder', () => {
  it('creates order with correct total', async () => {
    const mockRepo = { save: vi.fn().mockResolvedValue({ id: '123' }) };
    const service = new OrderService(mockRepo);

    const result = await service.createOrder({
      customerId: 'C1',
      items: [
        { productId: 'P1', quantity: 2, price: 10 },
        { productId: 'P2', quantity: 1, price: 15 }
      ]
    });

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ total: 35 })
    );
  });
});
```

## Testing Trivial Code

Getters, setters, and simple assignments add test maintenance burden with zero value.

### Anti-Pattern: Testing Getters/Setters

```typescript
// ❌ DON'T: Test trivial getters/setters
class Order {
  constructor(private _id: string, private _customerId: string) {}

  get id(): string {
    return this._id;
  }

  get customerId(): string {
    return this._customerId;
  }
}

describe('Order', () => {
  it('returns id', () => {
    const order = new Order('123', 'C1');
    expect(order.id).toBe('123');
  });

  it('returns customerId', () => {
    const order = new Order('123', 'C1');
    expect(order.customerId).toBe('C1');
  });
});
```

**Problem:**
- Tests trivial property access
- Maintenance burden: change property, update test
- Compiler already validates property access

**Solution:** Only test getters with logic

```typescript
// ✓ DO: Test getters with computed values
class Order {
  constructor(
    private _id: string,
    private _customerId: string,
    private _items: OrderItem[]
  ) {}

  get id(): string {
    return this._id;
  }

  get total(): number {
    return this._items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}

describe('Order', () => {
  it('calculates total from items', () => {
    const order = new Order('123', 'C1', [
      { productId: 'P1', quantity: 2, price: 10 },
      { productId: 'P2', quantity: 1, price: 15 }
    ]);

    // Only test computed properties with logic
    expect(order.total).toBe(35);
  });
});
```

## Testing Framework Behavior

Framework libraries are already tested. Don't test Express, Jest, or database driver behavior.

### Anti-Pattern: Testing Framework Features

```typescript
// ❌ DON'T: Test Express parses JSON
import request from 'supertest';
import { Express } from 'express';

describe('Express integration', () => {
  it('parses JSON request body', async () => {
    const app: Express = express();
    app.use(express.json());

    app.post('/test', (req, res) => {
      res.json(req.body);
    });

    const response = await request(app)
      .post('/test')
      .send({ name: 'John' });

    // Framework already does this!
    expect(typeof response.body).toBe('object');
    expect(response.body.name).toBe('John');
  });
});

// ❌ DON'T: Test database driver functionality
describe('Database driver', () => {
  it('returns results as array', async () => {
    const result = await db.query('SELECT * FROM orders');

    // Driver already does this
    expect(Array.isArray(result)).toBe(true);
  });
});
```

**Problem:**
- Framework/library already tested by maintainers
- Wastes test execution time
- No value - not testing your code

**Solution:** Test your code's integration with frameworks

```typescript
// ✓ DO: Test your integration with framework
describe('POST /orders', () => {
  it('parses request and calls service', async () => {
    const mockService = {
      createOrder: vi.fn().mockResolvedValue(Ok({ id: '123' }))
    };

    const app = createApp(mockService);

    const response = await request(app)
      .post('/orders')
      .send({ customerId: 'C1', items: [] });

    // Test your code, not Express behavior
    expect(mockService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'C1' })
    );
  });
});
```

## Testing Trivial Mappings

Simple property-to-property mappings without logic add maintenance burden.

### Anti-Pattern: Testing Simple Mappings

```typescript
// ❌ DON'T: Test trivial mappings
class OrderMapper {
  toResponse(order: Order): OrderResponse {
    return {
      id: order.id,
      customerId: order.customerId,
      status: order.status,
      total: order.total
    };
  }
}

describe('OrderMapper', () => {
  it('maps order to response', () => {
    const order = new Order('123', 'C1', [], 'pending', 0);
    const response = OrderMapper.toResponse(order);

    expect(response.id).toBe('123');
    expect(response.customerId).toBe('C1');
    expect(response.status).toBe('pending');
    expect(response.total).toBe(0);
  });
});
```

**Problem:**
- No logic to test - pure property copy
- Compiler validates mapping at type-check time
- Maintenance: change property, update test

**Solution:** Test mappings with logic or transformation

```typescript
// ✓ DO: Test mappings with transformations
class OrderMapper {
  // Includes logic: calculation, conditional, transformation
  toResponse(order: Order): OrderResponse {
    return {
      id: order.id,
      customerId: order.customerId,
      status: order.status,
      total: order.total,
      displayTotal: `$${order.total.toFixed(2)}`,
      // Only include recent orders
      isRecent: order.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000
    };
  }
}

describe('OrderMapper', () => {
  it('formats total with currency', () => {
    const order = new Order('123', 'C1', [], 'pending', 35.5);
    const response = OrderMapper.toResponse(order);

    expect(response.displayTotal).toBe('$35.50');
  });

  it('marks recent orders', () => {
    const order = new Order('123', 'C1', [], 'pending', 0, new Date());
    const response = OrderMapper.toResponse(order);

    expect(response.isRecent).toBe(true);
  });
});
```

## Testing Third-Party Libraries

Libraries have their own test suites. Test your integration, not their behavior.

### Anti-Pattern: Testing Library Behavior

```typescript
// ❌ DON'T: Test third-party library
import _ from 'lodash';

describe('lodash', () => {
  it('groups array elements', () => {
    const result = _.groupBy([1, 2, 3, 4], x => x % 2);
    expect(result[0]).toEqual([2, 4]);
    expect(result[1]).toEqual([1, 3]);
  });
});

// ❌ DON'T: Test validation library
import Joi from 'joi';

describe('Joi validation', () => {
  it('validates required field', () => {
    const schema = Joi.object({
      name: Joi.string().required()
    });

    const result = schema.validate({ name: 'John' });
    expect(result.error).toBeUndefined();
  });
});
```

**Problem:**
- Library already tested by maintainers
- No test coverage value - not testing your code
- Wasted execution time

**Solution:** Test your code that uses libraries

```typescript
// ✓ DO: Test how you use the library
describe('OrderValidator', () => {
  it('rejects order with missing customerId', () => {
    const result = OrderValidator.validate({
      // customerId missing
      items: [{ productId: 'P1', quantity: 1 }]
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('customerId');
  });

  it('accepts valid order', () => {
    const result = OrderValidator.validate({
      customerId: 'C1',
      items: [{ productId: 'P1', quantity: 1 }]
    });

    expect(result.ok).toBe(true);
  });
});

// ✓ DO: Test grouping logic (not lodash)
describe('OrderAnalytics', () => {
  it('groups orders by customer', () => {
    const orders = [
      { id: '1', customerId: 'C1' },
      { id: '2', customerId: 'C2' },
      { id: '3', customerId: 'C1' }
    ];

    const grouped = OrderAnalytics.groupByCustomer(orders);

    expect(grouped['C1']).toHaveLength(2);
    expect(grouped['C2']).toHaveLength(1);
  });
});
```

## Over-Testing (Too Many Tests)

Test everything eventually fails: changes break dozens of tests, even when behavior unchanged.

### Anti-Pattern: Testing Every Line

```typescript
// ❌ DON'T: Test every internal detail
class OrderService {
  async createOrder(request: CreateOrderRequest): Promise<Result<Order>> {
    // Test 1: validating format
    if (!request.customerId) return Err('Missing customerId');

    // Test 2: validating items
    if (!request.items || request.items.length === 0) return Err('Empty items');

    // Test 3: validating prices
    for (const item of request.items) {
      if (item.price < 0) return Err('Negative price');
    }

    // Test 4: validation result
    const order = Order.fromRequest(request);
    const validation = order.validate();
    if (!validation.ok) return validation;

    // Test 5: repo call
    const record = order.toRecord();

    // Test 6: repo result
    const saved = await this.repo.save(record);

    // Test 7: transformation
    return Ok(Order.fromRecord(saved));
  }
}

describe('OrderService.createOrder', () => {
  it('returns error for missing customerId', async () => { /* ... */ });
  it('returns error for empty items', async () => { /* ... */ });
  it('returns error for negative price', async () => { /* ... */ });
  it('validates order entity', async () => { /* ... */ });
  it('calls repo save', async () => { /* ... */ });
  it('transforms record to entity', async () => { /* ... */ });
  it('returns Ok result', async () => { /* ... */ });
  // 7 tests for 1 method - high maintenance
});
```

**Problem:**
- Every refactor breaks multiple tests
- Tests test implementation, not behavior
- Slow feedback loop
- Hard to see what actually matters

**Solution:** Test behavior, not implementation

```typescript
// ✓ DO: Test high-level behavior
describe('OrderService.createOrder', () => {
  it('creates order for valid request', async () => {
    const mockRepo = {
      save: vi.fn().mockResolvedValue({ id: '123' })
    };
    const service = new OrderService(mockRepo);

    const result = await service.createOrder({
      customerId: 'C1',
      items: [{ productId: 'P1', quantity: 1, price: 10 }]
    });

    expect(result.ok).toBe(true);
  });

  it('rejects invalid order', async () => {
    const mockRepo = { save: vi.fn() };
    const service = new OrderService(mockRepo);

    const result = await service.createOrder({
      customerId: 'C1',
      items: [] // Invalid
    });

    expect(result.ok).toBe(false);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  // 2 tests covering all code paths
});
```

## Under-Testing (Too Few Tests)

Only testing happy path leaves bugs in error handling and edge cases.

### Anti-Pattern: Only Testing Happy Path

```typescript
// ❌ DON'T: Only test success case
describe('OrderService.createOrder', () => {
  it('creates order', async () => {
    const mockRepo = {
      save: vi.fn().mockResolvedValue({ id: '123' })
    };
    const service = new OrderService(mockRepo);

    const result = await service.createOrder({
      customerId: 'C1',
      items: [{ productId: 'P1', quantity: 1, price: 10 }]
    });

    // Only tests success
    expect(result.ok).toBe(true);
  });
});
```

**Problem:**
- Error handling untested
- Edge cases not covered
- Production bugs from unhandled errors

**Solution:** Test both success and failure paths

```typescript
// ✓ DO: Test success and error paths
describe('OrderService.createOrder', () => {
  it('creates order for valid request', async () => {
    const mockRepo = {
      save: vi.fn().mockResolvedValue({ id: '123' })
    };
    const service = new OrderService(mockRepo);

    const result = await service.createOrder({
      customerId: 'C1',
      items: [{ productId: 'P1', quantity: 1, price: 10 }]
    });

    expect(result.ok).toBe(true);
  });

  it('returns error for empty items', async () => {
    const service = new OrderService(mockRepo);

    const result = await service.createOrder({
      customerId: 'C1',
      items: []
    });

    expect(result.ok).toBe(false);
  });

  it('returns error for missing customerId', async () => {
    const service = new OrderService(mockRepo);

    const result = await service.createOrder({
      customerId: '',
      items: [{ productId: 'P1', quantity: 1, price: 10 }]
    });

    expect(result.ok).toBe(false);
  });

  it('handles repository errors gracefully', async () => {
    const mockRepo = {
      save: vi.fn().mockRejectedValue(new Error('DB error'))
    };
    const service = new OrderService(mockRepo);

    const result = await service.createOrder({
      customerId: 'C1',
      items: [{ productId: 'P1', quantity: 1, price: 10 }]
    });

    expect(result.ok).toBe(false);
  });
});
```

## Testing with Unstable Mocks

Mocks that change behavior make tests brittle and unreliable.

### Anti-Pattern: Using Complex, Unstable Mocks

```typescript
// ❌ DON'T: Create complex, coupled mocks
class OrderServiceTest {
  createMockService() {
    return {
      createOrder: vi.fn(async (req) => {
        // Mock coupled to implementation
        if (!req.customerId) return Err('Missing');
        if (!req.items || req.items.length === 0) return Err('Empty');

        // Duplicates validation logic from real service
        return Ok(new Order('123', req.customerId, req.items, 'pending', 35));
      })
    };
  }
}

// Test breaks if validation changes in real service
describe('OrderController', () => {
  it('handles service error', async () => {
    const mockService = createMockService();
    const controller = new OrderController(mockService);

    const result = await controller.createOrder({ customerId: '', items: [] });

    // Brittle - depends on mock implementation
    expect(result.status).toBe(400);
  });
});
```

**Problem:**
- Mock duplicates validation logic
- Test breaks if validation logic changes
- Mock and real code diverge over time

**Solution:** Use simple, declarative mocks

```typescript
// ✓ DO: Use simple mocks with vi.fn()
describe('OrderController', () => {
  it('handles service error', async () => {
    const mockService = {
      createOrder: vi.fn().mockResolvedValue(Err('Invalid order'))
    };
    const controller = new OrderController(mockService);

    const result = await controller.createOrder({
      customerId: 'C1',
      items: [{ productId: 'P1', quantity: 1, price: 10 }]
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('Invalid order');
  });
});
```

## Summary: When to Skip Tests

Save effort by NOT testing:

| What | Why | Exception |
|------|-----|-----------|
| Getters/setters | No logic | Computed properties |
| Framework behavior | Already tested | Your integration with framework |
| Library behavior | Already tested | Your usage of library |
| Trivial mappings | No logic, type-safe | Mappings with transformation |
| Private methods | Access through public API | Can't isolate the logic |
| Internal details | Break on refactor | Public behavior only |

Focus testing effort on:
- Business logic and rules
- Validation and error handling
- Integration points and boundaries
- Public APIs and contracts
