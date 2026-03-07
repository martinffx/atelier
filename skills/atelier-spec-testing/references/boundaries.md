# Layer Boundary Testing Patterns

Detailed boundary testing patterns for each layer in the architecture.

## Core Principle

Test the contract between layers, not the implementation within layers.

```
Test here ──────▼──────────────────▼────── Test here
          Effectful Edge    │    Functional Core
              (stub)        │       (unit test)
```

## Entity Boundary (Functional Core)

Pure functions with no dependencies.

### What to Test at Entity Boundary

- Validation rules
- Business rules
- Data transformations (fromRequest, toRecord, toResponse)
- Invariants and state management
- Edge cases and error conditions

### Entity Test Examples

```typescript
describe('Order entity', () => {
  describe('validation', () => {
    it('rejects empty items', () => {
      const order = new Order('1', 'C1', [], 'pending', 0);
      const result = order.validate();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('at least one item');
    });

    it('rejects negative total', () => {
      const order = new Order('1', 'C1', [], 'pending', -10);
      const result = order.validate();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('total must be positive');
    });

    it('accepts valid order', () => {
      const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], 'pending', 10);
      const result = order.validate();
      expect(result.ok).toBe(true);
    });
  });

  describe('business rules', () => {
    it('cannot cancel shipped order', () => {
      const order = new Order('1', 'C1', [], 'shipped', 0);
      expect(order.canCancel()).toBe(false);
    });

    it('can cancel pending order', () => {
      const order = new Order('1', 'C1', [], 'pending', 0);
      expect(order.canCancel()).toBe(true);
    });

    it('calculates discount correctly', () => {
      const order = new Order('1', 'C1', [], 'pending', 100);
      const discounted = order.applyDiscount(0.1); // 10% discount
      expect(discounted.total).toBe(90);
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
      expect(order.customerId).toBe('C1');
      expect(order.total).toBe(35);
      expect(order.status).toBe('pending');
    });

    it('converts entity to database record', () => {
      const order = new Order('123', 'C1', [{ productId: 'P1', quantity: 2, price: 10 }], 'pending', 20);
      const record = order.toRecord();

      expect(record.id).toBe('123');
      expect(record.customer_id).toBe('C1');
      expect(record.status).toBe('pending');
      expect(record.items).toBe(JSON.stringify([{ productId: 'P1', quantity: 2, price: 10 }]));
      expect(record.total).toBe(20);
    });

    it('converts database record back to entity', () => {
      const record = {
        id: '123',
        customer_id: 'C1',
        items: '[{"productId":"P1","quantity":2,"price":10}]',
        status: 'pending',
        total: 20
      };
      const order = Order.fromRecord(record);

      expect(order.id).toBe('123');
      expect(order.customerId).toBe('C1');
      expect(order.items).toHaveLength(1);
      expect(order.items[0].productId).toBe('P1');
    });

    it('converts entity to API response', () => {
      const order = new Order('123', 'C1', [{ productId: 'P1', quantity: 2, price: 10 }], 'pending', 20);
      const response = order.toResponse();

      expect(response.id).toBe('123');
      expect(response.customerId).toBe('C1');
      expect(response.status).toBe('pending');
      expect(response.total).toBe(20);
    });
  });

  describe('invariants', () => {
    it('maintains total consistency with items', () => {
      const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 2, price: 10 }], 'pending', 20);

      // Invariant: total always matches item calculation
      const calculated = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      expect(order.total).toBe(calculated);
    });

    it('prevents invalid status transitions', () => {
      const order = new Order('1', 'C1', [], 'shipped', 0);

      // Cannot go backwards
      expect(() => order.updateStatus('pending')).toThrow('Invalid status transition');
    });
  });
});
```

## Service Boundary (Functional Core)

Orchestration logic with stubbed dependencies.

### What to Test at Service Boundary

- Business workflow execution
- Orchestration of multiple entities
- Error propagation and handling
- Repository interaction patterns
- Validation and state transitions

### Service Test Examples

```typescript
describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepo: OrderRepository;
  let mockInventoryRepo: InventoryRepository;

  beforeEach(() => {
    mockOrderRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn()
    };
    mockInventoryRepo = {
      checkAvailability: vi.fn(),
      reserve: vi.fn(),
      release: vi.fn()
    };

    service = new OrderService(mockOrderRepo, mockInventoryRepo);
  });

  describe('createOrder', () => {
    it('creates order with valid data', async () => {
      mockInventoryRepo.checkAvailability.mockResolvedValue({ available: true });
      mockOrderRepo.save.mockResolvedValue({ id: '123' });

      const result = await service.createOrder({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2 }]
      });

      expect(result.ok).toBe(true);
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });

    it('checks inventory before saving', async () => {
      mockInventoryRepo.checkAvailability.mockResolvedValue({ available: true });
      mockOrderRepo.save.mockResolvedValue({ id: '123' });

      await service.createOrder({
        customerId: 'C1',
        items: [
          { productId: 'P1', quantity: 2 },
          { productId: 'P2', quantity: 3 }
        ]
      });

      expect(mockInventoryRepo.checkAvailability).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ productId: 'P1', quantity: 2 }),
          expect.objectContaining({ productId: 'P2', quantity: 3 })
        ])
      );
    });

    it('does not save order when inventory unavailable', async () => {
      mockInventoryRepo.checkAvailability.mockResolvedValue({ available: false });

      const result = await service.createOrder({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 100 }]
      });

      expect(result.ok).toBe(false);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('reverses inventory reservation on save failure', async () => {
      mockInventoryRepo.checkAvailability.mockResolvedValue({ available: true });
      mockOrderRepo.save.mockRejectedValue(new Error('DB error'));

      const result = await service.createOrder({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2 }]
      });

      expect(result.ok).toBe(false);
      expect(mockInventoryRepo.release).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('finds order and cancels it', async () => {
      mockOrderRepo.findById.mockResolvedValue({ id: '123', status: 'pending' });
      mockOrderRepo.save.mockResolvedValue({ id: '123', status: 'cancelled' });

      const result = await service.cancelOrder('123');

      expect(result.ok).toBe(true);
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });

    it('releases inventory when cancelling', async () => {
      mockOrderRepo.findById.mockResolvedValue({
        id: '123',
        status: 'pending',
        items: [{ productId: 'P1', quantity: 2 }]
      });

      await service.cancelOrder('123');

      expect(mockInventoryRepo.release).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ productId: 'P1', quantity: 2 })
        ])
      );
    });

    it('returns error if order not found', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      const result = await service.cancelOrder('999');

      expect(result.ok).toBe(false);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('returns error if order cannot be cancelled', async () => {
      mockOrderRepo.findById.mockResolvedValue({ id: '123', status: 'shipped' });

      const result = await service.cancelOrder('123');

      expect(result.ok).toBe(false);
    });
  });
});
```

## Router Boundary (Effectful Edge)

HTTP request/response handling.

### What to Test at Router Boundary

- Request parsing and validation
- Response status codes and format
- Error response handling
- Request/response transformations
- HTTP headers and content types

### Router Test Examples

```typescript
describe('Order API', () => {
  let app: Express;
  let mockService: OrderService;

  beforeEach(() => {
    mockService = {
      createOrder: vi.fn(),
      cancelOrder: vi.fn(),
      getOrder: vi.fn()
    };
    app = createApp(mockService);
  });

  describe('POST /orders', () => {
    it('returns 201 for valid request', async () => {
      mockService.createOrder.mockResolvedValue(
        Ok(new Order('123', 'C1', [], 'pending', 0))
      );

      const response = await request(app)
        .post('/orders')
        .send({ customerId: 'C1', items: [{ productId: 'P1', quantity: 2 }] });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('123');
      expect(response.body.status).toBe('pending');
    });

    it('returns 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/orders')
        .send({ customerId: 'C1' }); // Missing items

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('returns 400 when service returns error', async () => {
      mockService.createOrder.mockResolvedValue(
        Err('Invalid order')
      );

      const response = await request(app)
        .post('/orders')
        .send({ customerId: 'C1', items: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid order');
    });

    it('includes correct content-type header', async () => {
      mockService.createOrder.mockResolvedValue(
        Ok(new Order('123', 'C1', [], 'pending', 0))
      );

      const response = await request(app)
        .post('/orders')
        .send({ customerId: 'C1', items: [{ productId: 'P1', quantity: 2 }] });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /orders/:id', () => {
    it('returns 200 with order', async () => {
      mockService.getOrder.mockResolvedValue(
        Ok(new Order('123', 'C1', [], 'pending', 0))
      );

      const response = await request(app)
        .get('/orders/123');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('123');
    });

    it('returns 404 when order not found', async () => {
      mockService.getOrder.mockResolvedValue(
        Err('Order not found')
      );

      const response = await request(app)
        .get('/orders/999');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /orders/:id', () => {
    it('returns 204 on successful cancel', async () => {
      mockService.cancelOrder.mockResolvedValue(Ok(undefined));

      const response = await request(app)
        .delete('/orders/123');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    it('returns 400 when cancel fails', async () => {
      mockService.cancelOrder.mockResolvedValue(
        Err('Cannot cancel shipped order')
      );

      const response = await request(app)
        .delete('/orders/123');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot cancel shipped order');
    });
  });
});
```

## Repository Boundary (Effectful Edge)

Database operations.

### What to Test at Repository Boundary

- Save operations preserve data
- Retrieval returns correct data
- Updates modify existing records
- Deletes remove records
- Complex queries return expected results
- Transaction handling

### Repository Test Examples

```typescript
describe('OrderRepository', () => {
  let repo: OrderRepository;
  let testDb: Database;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    repo = new OrderRepository(testDb);
  });

  afterEach(async () => {
    await testDb.close();
  });

  describe('save', () => {
    it('saves order to database', async () => {
      const record = {
        id: '123',
        customer_id: 'C1',
        items: JSON.stringify([{ productId: 'P1', quantity: 2 }]),
        status: 'pending',
        total: 20
      };

      const saved = await repo.save(record);

      expect(saved.id).toBe('123');
      expect(saved.customer_id).toBe('C1');

      // Verify in database
      const found = await testDb.orders.findOne({ id: '123' });
      expect(found).toBeDefined();
    });

    it('updates existing order', async () => {
      const record = {
        id: '123',
        customer_id: 'C1',
        items: JSON.stringify([]),
        status: 'pending',
        total: 0
      };

      await repo.save(record);

      const updated = { ...record, status: 'shipped' };
      await repo.save(updated);

      const found = await testDb.orders.findOne({ id: '123' });
      expect(found.status).toBe('shipped');
    });
  });

  describe('findById', () => {
    it('retrieves order by id', async () => {
      const record = {
        id: '123',
        customer_id: 'C1',
        items: JSON.stringify([]),
        status: 'pending',
        total: 0
      };

      await repo.save(record);
      const found = await repo.findById('123');

      expect(found).toEqual(record);
    });

    it('returns null for non-existent id', async () => {
      const found = await repo.findById('999');

      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes order from database', async () => {
      const record = {
        id: '123',
        customer_id: 'C1',
        items: JSON.stringify([]),
        status: 'pending',
        total: 0
      };

      await repo.save(record);
      await repo.delete('123');

      const found = await testDb.orders.findOne({ id: '123' });
      expect(found).toBeUndefined();
    });
  });
});
```

## Consumer Boundary (Effectful Edge)

Event message handling.

### Consumer Test Examples

```typescript
describe('OrderConsumer', () => {
  let consumer: OrderConsumer;
  let mockService: OrderService;

  beforeEach(() => {
    mockService = {
      processOrder: vi.fn(),
      handlePayment: vi.fn()
    };
    consumer = new OrderConsumer(mockService);
  });

  describe('OrderPlaced event', () => {
    it('calls service with event data', async () => {
      mockService.processOrder.mockResolvedValue(Ok({}));

      const event = {
        type: 'OrderPlaced',
        data: { orderId: '123', customerId: 'C1' }
      };

      await consumer.handle(event);

      expect(mockService.processOrder).toHaveBeenCalledWith('123');
    });

    it('ignores unknown event types', async () => {
      const event = {
        type: 'UnknownEvent',
        data: {}
      };

      await consumer.handle(event);

      expect(mockService.processOrder).not.toHaveBeenCalled();
    });
  });
});
```

## Summary Table

| Boundary | Test Type | What to Stub | What to Assert |
|----------|-----------|--------------|-----------------|
| **Entity** | Unit | Nothing (pure) | Validation, rules, transforms |
| **Service** | Unit | Repositories, other services | Orchestration logic, error handling |
| **Router** | Integration | Service | Status codes, response format, headers |
| **Repository** | Integration | Database connection | CRUD operations, queries |
| **Consumer** | Integration | Service, event source | Event parsing, service calls |
