# Edge Testing Patterns

Router, Repository, Consumer, Producer, and Client integration test patterns.

## Router Integration Tests

Test HTTP request/response handling with real HTTP but stubbed service.

### What to Test

- Request parsing and validation
- Response status codes (200, 201, 400, 404, 500)
- Response body structure and format
- Error response handling
- HTTP headers (content-type, cache-control, etc.)
- Request/response transformations

### Router Test Setup

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from './app';
import { OrderService } from './order-service';
import { vi } from 'vitest';
import { Ok, Err } from './result';
import { Order } from './order';

describe('Order API', () => {
  let app: Express;
  let mockService: OrderService;

  beforeEach(() => {
    // Create mock service
    mockService = {
      createOrder: vi.fn(),
      getOrder: vi.fn(),
      cancelOrder: vi.fn(),
      getCustomerOrders: vi.fn()
    };

    // Create app with mocked service
    app = createApp(mockService);
  });
});
```

### POST Endpoint Tests

```typescript
describe('POST /orders', () => {
  it('returns 201 with order for valid request', async () => {
    mockService.createOrder.mockResolvedValue(
      Ok(new Order('123', 'C1', [{ productId: 'P1', quantity: 2, price: 10 }], 'pending', 20))
    );

    const response = await request(app)
      .post('/orders')
      .send({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2 }]
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.id).toBe('123');
    expect(response.body.customerId).toBe('C1');
    expect(response.body.status).toBe('pending');
  });

  it('returns 400 for missing required field', async () => {
    const response = await request(app)
      .post('/orders')
      .send({
        // customerId missing
        items: [{ productId: 'P1', quantity: 2 }]
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('customerId');
  });

  it('returns 400 for empty items array', async () => {
    const response = await request(app)
      .post('/orders')
      .send({
        customerId: 'C1',
        items: []
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('items');
  });

  it('returns 400 when service returns error', async () => {
    mockService.createOrder.mockResolvedValue(
      Err('Invalid order')
    );

    const response = await request(app)
      .post('/orders')
      .send({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2 }]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid order');
  });

  it('sets correct content-type header', async () => {
    mockService.createOrder.mockResolvedValue(
      Ok(new Order('123', 'C1', [], 'pending', 0))
    );

    const response = await request(app)
      .post('/orders')
      .send({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2 }]
      });

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('includes location header with resource URL', async () => {
    mockService.createOrder.mockResolvedValue(
      Ok(new Order('123', 'C1', [], 'pending', 0))
    );

    const response = await request(app)
      .post('/orders')
      .send({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2 }]
      });

    expect(response.headers['location']).toBe('/orders/123');
  });

  it('handles service errors gracefully', async () => {
    mockService.createOrder.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/orders')
      .send({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2 }]
      });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});
```

### GET Endpoint Tests

```typescript
describe('GET /orders/:id', () => {
  it('returns 200 with order', async () => {
    mockService.getOrder.mockResolvedValue(
      Ok(new Order('123', 'C1', [{ productId: 'P1', quantity: 2, price: 10 }], 'pending', 20))
    );

    const response = await request(app)
      .get('/orders/123');

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('123');
    expect(response.body.customerId).toBe('C1');
  });

  it('returns 404 when order not found', async () => {
    mockService.getOrder.mockResolvedValue(
      Err('Order not found')
    );

    const response = await request(app)
      .get('/orders/999');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Order not found');
  });

  it('includes cache control headers', async () => {
    mockService.getOrder.mockResolvedValue(
      Ok(new Order('123', 'C1', [], 'pending', 0))
    );

    const response = await request(app)
      .get('/orders/123');

    expect(response.headers['cache-control']).toBeDefined();
  });

  it('validates order id parameter', async () => {
    const response = await request(app)
      .get('/orders/invalid-uuid-format');

    expect(response.status).toBe(400);
  });
});

describe('GET /customers/:customerId/orders', () => {
  it('returns 200 with array of orders', async () => {
    mockService.getCustomerOrders.mockResolvedValue(
      Ok([
        new Order('123', 'C1', [], 'pending', 0),
        new Order('124', 'C1', [], 'shipped', 50)
      ])
    );

    const response = await request(app)
      .get('/customers/C1/orders');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
  });

  it('returns empty array for customer with no orders', async () => {
    mockService.getCustomerOrders.mockResolvedValue(Ok([]));

    const response = await request(app)
      .get('/customers/C999/orders');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
```

### DELETE Endpoint Tests

```typescript
describe('DELETE /orders/:id', () => {
  it('returns 204 on successful cancel', async () => {
    mockService.cancelOrder.mockResolvedValue(Ok(undefined));

    const response = await request(app)
      .delete('/orders/123');

    expect(response.status).toBe(204);
    expect(Object.keys(response.body)).toHaveLength(0);
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

  it('returns 404 for non-existent order', async () => {
    mockService.cancelOrder.mockResolvedValue(
      Err('Order not found')
    );

    const response = await request(app)
      .delete('/orders/999');

    expect(response.status).toBe(404);
  });

  it('calls service with correct order id', async () => {
    mockService.cancelOrder.mockResolvedValue(Ok(undefined));

    await request(app)
      .delete('/orders/123');

    expect(mockService.cancelOrder).toHaveBeenCalledWith('123');
  });
});
```

## Repository Integration Tests

Test database operations with real test database.

### Repository Test Setup

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrderRepository } from './order-repository';
import { Database } from './database';
import { createTestDatabase, cleanupTestDatabase } from './test-fixtures/database';

describe('OrderRepository', () => {
  let repo: OrderRepository;
  let testDb: Database;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    repo = new OrderRepository(testDb);
  });

  afterEach(async () => {
    await cleanupTestDatabase(testDb);
  });
});
```

### CRUD Operation Tests

```typescript
describe('save', () => {
  it('saves new order to database', async () => {
    const record = {
      id: '123',
      customer_id: 'C1',
      items: JSON.stringify([{ productId: 'P1', quantity: 2, price: 10 }]),
      status: 'pending',
      total: 20
    };

    const saved = await repo.save(record);

    expect(saved.id).toBe('123');
    expect(saved.total).toBe(20);

    // Verify persisted in database
    const found = await testDb.orders.findOne({ id: '123' });
    expect(found).toBeDefined();
    expect(found.customer_id).toBe('C1');
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
    const result = await repo.save(updated);

    expect(result.status).toBe('shipped');

    // Verify update persisted
    const found = await testDb.orders.findOne({ id: '123' });
    expect(found.status).toBe('shipped');
  });

  it('preserves other fields when updating', async () => {
    const record = {
      id: '123',
      customer_id: 'C1',
      items: JSON.stringify([{ productId: 'P1', quantity: 1, price: 10 }]),
      status: 'pending',
      total: 10
    };

    await repo.save(record);

    const updated = { ...record, status: 'shipped' };
    await repo.save(updated);

    const found = await testDb.orders.findOne({ id: '123' });
    expect(found.customer_id).toBe('C1');
    expect(found.items).toBe(JSON.stringify([{ productId: 'P1', quantity: 1, price: 10 }]));
    expect(found.total).toBe(10);
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

    expect(found).toBeDefined();
    expect(found.customer_id).toBe('C1');
  });

  it('returns null for non-existent id', async () => {
    const found = await repo.findById('non-existent');

    expect(found).toBeNull();
  });

  it('parses JSON fields correctly', async () => {
    const items = [
      { productId: 'P1', quantity: 2, price: 10 },
      { productId: 'P2', quantity: 1, price: 15 }
    ];
    const record = {
      id: '123',
      customer_id: 'C1',
      items: JSON.stringify(items),
      status: 'pending',
      total: 35
    };

    await repo.save(record);
    const found = await repo.findById('123');

    // Verify JSON parsing
    const parsedItems = JSON.parse(found.items);
    expect(parsedItems).toEqual(items);
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

  it('does not error if deleting non-existent order', async () => {
    expect(async () => {
      await repo.delete('non-existent');
    }).not.toThrow();
  });
});
```

### Query Tests

```typescript
describe('findByCustomerId', () => {
  beforeEach(async () => {
    // Seed database
    await repo.save({
      id: '123',
      customer_id: 'C1',
      items: JSON.stringify([]),
      status: 'pending',
      total: 0
    });
    await repo.save({
      id: '124',
      customer_id: 'C1',
      items: JSON.stringify([]),
      status: 'shipped',
      total: 50
    });
    await repo.save({
      id: '125',
      customer_id: 'C2',
      items: JSON.stringify([]),
      status: 'pending',
      total: 100
    });
  });

  it('returns all orders for customer', async () => {
    const orders = await repo.findByCustomerId('C1');

    expect(orders).toHaveLength(2);
    expect(orders.map(o => o.id)).toEqual(['123', '124']);
  });

  it('returns empty array for customer with no orders', async () => {
    const orders = await repo.findByCustomerId('C999');

    expect(orders).toEqual([]);
  });

  it('does not return other customers orders', async () => {
    const orders = await repo.findByCustomerId('C1');

    expect(orders.every(o => o.customer_id === 'C1')).toBe(true);
  });
});

describe('findByStatus', () => {
  beforeEach(async () => {
    await repo.save({
      id: '123',
      customer_id: 'C1',
      items: JSON.stringify([]),
      status: 'pending',
      total: 0
    });
    await repo.save({
      id: '124',
      customer_id: 'C1',
      items: JSON.stringify([]),
      status: 'shipped',
      total: 50
    });
    await repo.save({
      id: '125',
      customer_id: 'C2',
      items: JSON.stringify([]),
      status: 'pending',
      total: 100
    });
  });

  it('returns orders with given status', async () => {
    const orders = await repo.findByStatus('pending');

    expect(orders).toHaveLength(2);
    expect(orders.every(o => o.status === 'pending')).toBe(true);
  });

  it('returns empty array for non-existent status', async () => {
    const orders = await repo.findByStatus('unknown-status');

    expect(orders).toEqual([]);
  });
});
```

## Consumer Integration Tests

Test event message handling.

### Consumer Test Setup

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderConsumer } from './order-consumer';
import { OrderService } from './order-service';
import { Ok, Err } from './result';

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
});
```

### Event Handling Tests

```typescript
describe('OrderPlaced event', () => {
  it('calls service with order id', async () => {
    mockService.processOrder.mockResolvedValue(Ok({}));

    const event = {
      type: 'OrderPlaced',
      data: { orderId: '123', customerId: 'C1' }
    };

    await consumer.handle(event);

    expect(mockService.processOrder).toHaveBeenCalledWith('123');
  });

  it('returns error if service fails', async () => {
    mockService.processOrder.mockRejectedValue(new Error('Process failed'));

    const event = {
      type: 'OrderPlaced',
      data: { orderId: '123', customerId: 'C1' }
    };

    expect(async () => {
      await consumer.handle(event);
    }).rejects.toThrow('Process failed');
  });

  it('handles missing required fields', async () => {
    const event = {
      type: 'OrderPlaced',
      data: { customerId: 'C1' } // Missing orderId
    };

    expect(async () => {
      await consumer.handle(event);
    }).rejects.toThrow('orderId');
  });
});

describe('PaymentProcessed event', () => {
  it('calls handlePayment with event data', async () => {
    mockService.handlePayment.mockResolvedValue(Ok({}));

    const event = {
      type: 'PaymentProcessed',
      data: { orderId: '123', amount: 100 }
    };

    await consumer.handle(event);

    expect(mockService.handlePayment).toHaveBeenCalledWith({
      orderId: '123',
      amount: 100
    });
  });
});

describe('unknown events', () => {
  it('ignores unknown event types', async () => {
    const event = {
      type: 'UnknownEventType',
      data: {}
    };

    await consumer.handle(event);

    expect(mockService.processOrder).not.toHaveBeenCalled();
    expect(mockService.handlePayment).not.toHaveBeenCalled();
  });
});
```

## Producer Integration Tests

Test event publishing.

### Producer Test Examples

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderProducer } from './order-producer';
import { MessageQueue } from './message-queue';

describe('OrderProducer', () => {
  let producer: OrderProducer;
  let mockQueue: MessageQueue;

  beforeEach(() => {
    mockQueue = {
      publish: vi.fn()
    };
    producer = new OrderProducer(mockQueue);
  });

  describe('publishOrderCreated', () => {
    it('publishes event with correct schema', async () => {
      mockQueue.publish.mockResolvedValue(undefined);

      await producer.publishOrderCreated({
        orderId: '123',
        customerId: 'C1',
        total: 100
      });

      expect(mockQueue.publish).toHaveBeenCalledWith(
        'orders',
        expect.objectContaining({
          type: 'OrderCreated',
          data: expect.objectContaining({
            orderId: '123',
            customerId: 'C1',
            total: 100
          })
        })
      );
    });

    it('includes timestamp in event', async () => {
      mockQueue.publish.mockResolvedValue(undefined);

      await producer.publishOrderCreated({
        orderId: '123',
        customerId: 'C1',
        total: 100
      });

      const call = mockQueue.publish.mock.calls[0];
      expect(call[1].timestamp).toBeDefined();
    });
  });
});
```

## Client Integration Tests

Test external API calls with mock server.

### Client Test Setup

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { PaymentClient } from './payment-client';

const mockServer = setupServer();

describe('PaymentClient', () => {
  let client: PaymentClient;

  beforeAll(() => {
    mockServer.listen();
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });

  beforeEach(() => {
    client = new PaymentClient('http://payment-api.test');
  });
});
```

### API Call Tests

```typescript
describe('processPayment', () => {
  it('calls payment API with correct payload', async () => {
    mockServer.use(
      http.post('http://payment-api.test/payments', ({ request }) => {
        return HttpResponse.json({ transactionId: 'TXN123' });
      })
    );

    const result = await client.processPayment({
      orderId: '123',
      amount: 100,
      customerId: 'C1'
    });

    expect(result.transactionId).toBe('TXN123');
  });

  it('handles API errors gracefully', async () => {
    mockServer.use(
      http.post('http://payment-api.test/payments', () => {
        return HttpResponse.json(
          { error: 'Payment declined' },
          { status: 400 }
        );
      })
    );

    expect(async () => {
      await client.processPayment({
        orderId: '123',
        amount: 100,
        customerId: 'C1'
      });
    }).rejects.toThrow('Payment declined');
  });

  it('retries on network timeout', async () => {
    let attempts = 0;
    mockServer.use(
      http.post('http://payment-api.test/payments', () => {
        attempts++;
        if (attempts < 2) {
          return HttpResponse.error();
        }
        return HttpResponse.json({ transactionId: 'TXN123' });
      })
    );

    const result = await client.processPayment({
      orderId: '123',
      amount: 100,
      customerId: 'C1'
    });

    expect(result.transactionId).toBe('TXN123');
    expect(attempts).toBe(2);
  });
});
```
