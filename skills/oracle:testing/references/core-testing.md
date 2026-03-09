# Core Testing Patterns

Comprehensive Entity and Service testing patterns for functional core testing.

## Entity Testing Strategy

Entities are pure functions with no dependencies. Test all business logic here.

### What to Test

- Validation rules (required fields, constraints, ranges)
- Business rules (state machines, invariants, constraints)
- Data transformations (fromRequest, toRecord, toResponse)
- Edge cases and error conditions
- Calculated properties

### What NOT to Test

- Simple getters/setters
- Property assignments
- Framework code
- Trivial mappings without logic

### Entity Test Structure

```typescript
describe('Entity', () => {
  describe('validation', () => {
    // Required fields, constraints, formats
  });

  describe('business rules', () => {
    // State transitions, constraints, invariants
  });

  describe('transformations', () => {
    // fromRequest, toRecord, toResponse, fromRecord
  });

  describe('calculated properties', () => {
    // Properties derived from other data
  });

  describe('invariants', () => {
    // Conditions that must always be true
  });
});
```

## Comprehensive Entity Example

```typescript
import { describe, it, expect } from 'vitest';
import { Order, OrderStatus } from './order';
import { Ok, Err } from './result';

describe('Order Entity', () => {
  describe('validation', () => {
    it('rejects order with empty items', () => {
      const order = new Order('1', 'C1', [], OrderStatus.PENDING, 0);
      const result = order.validate();

      expect(result.ok).toBe(false);
      expect(result.error).toContain('at least one item');
    });

    it('rejects order with negative total', () => {
      const order = new Order(
        '1',
        'C1',
        [{ productId: 'P1', quantity: 1, price: 10 }],
        OrderStatus.PENDING,
        -50
      );
      const result = order.validate();

      expect(result.ok).toBe(false);
      expect(result.error).toContain('total must be positive');
    });

    it('rejects order with invalid customer id', () => {
      const order = new Order('1', '', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.PENDING, 10);
      const result = order.validate();

      expect(result.ok).toBe(false);
      expect(result.error).toContain('customer id');
    });

    it('accepts valid order', () => {
      const order = new Order(
        '1',
        'C1',
        [{ productId: 'P1', quantity: 1, price: 10 }],
        OrderStatus.PENDING,
        10
      );
      const result = order.validate();

      expect(result.ok).toBe(true);
    });

    it('validates all items have positive quantity', () => {
      const order = new Order(
        '1',
        'C1',
        [
          { productId: 'P1', quantity: 1, price: 10 },
          { productId: 'P2', quantity: 0, price: 5 }
        ],
        OrderStatus.PENDING,
        10
      );
      const result = order.validate();

      expect(result.ok).toBe(false);
      expect(result.error).toContain('quantity');
    });
  });

  describe('business rules', () => {
    describe('order cancellation', () => {
      it('allows cancellation of pending order', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.PENDING, 10);
        expect(order.canCancel()).toBe(true);
      });

      it('prevents cancellation of shipped order', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.SHIPPED, 10);
        expect(order.canCancel()).toBe(false);
      });

      it('prevents cancellation of delivered order', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.DELIVERED, 10);
        expect(order.canCancel()).toBe(false);
      });

      it('prevents cancellation of cancelled order', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.CANCELLED, 10);
        expect(order.canCancel()).toBe(false);
      });
    });

    describe('status transitions', () => {
      it('allows valid transition from pending to shipped', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.PENDING, 10);
        expect(() => order.updateStatus(OrderStatus.SHIPPED)).not.toThrow();
        expect(order.status).toBe(OrderStatus.SHIPPED);
      });

      it('prevents invalid transition from shipped back to pending', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.SHIPPED, 10);
        expect(() => order.updateStatus(OrderStatus.PENDING)).toThrow('Invalid status transition');
      });

      it('prevents invalid transition from delivered to pending', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.DELIVERED, 10);
        expect(() => order.updateStatus(OrderStatus.PENDING)).toThrow('Invalid status transition');
      });
    });

    describe('discount application', () => {
      it('applies percentage discount', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 100 }], OrderStatus.PENDING, 100);
        const discounted = order.applyDiscount(0.1); // 10% off

        expect(discounted.total).toBe(90);
        expect(order.total).toBe(100); // Original unchanged
      });

      it('prevents discount over 50%', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 100 }], OrderStatus.PENDING, 100);

        expect(() => order.applyDiscount(0.6)).toThrow('Discount exceeds maximum');
      });

      it('prevents negative discount', () => {
        const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 100 }], OrderStatus.PENDING, 100);

        expect(() => order.applyDiscount(-0.1)).toThrow('Discount must be non-negative');
      });
    });
  });

  describe('transformations', () => {
    describe('fromRequest', () => {
      it('transforms request to entity with calculated total', () => {
        const order = Order.fromRequest({
          customerId: 'C1',
          items: [
            { productId: 'P1', quantity: 2, price: 10 },
            { productId: 'P2', quantity: 1, price: 15 }
          ]
        });

        expect(order.customerId).toBe('C1');
        expect(order.total).toBe(35);
        expect(order.status).toBe(OrderStatus.PENDING);
        expect(order.items).toHaveLength(2);
      });

      it('assigns unique id on creation', () => {
        const order1 = Order.fromRequest({
          customerId: 'C1',
          items: [{ productId: 'P1', quantity: 1, price: 10 }]
        });

        const order2 = Order.fromRequest({
          customerId: 'C1',
          items: [{ productId: 'P1', quantity: 1, price: 10 }]
        });

        expect(order1.id).not.toBe(order2.id);
      });

      it('creates timestamp on creation', () => {
        const before = Date.now();
        const order = Order.fromRequest({
          customerId: 'C1',
          items: [{ productId: 'P1', quantity: 1, price: 10 }]
        });
        const after = Date.now();

        expect(order.createdAt.getTime()).toBeGreaterThanOrEqual(before);
        expect(order.createdAt.getTime()).toBeLessThanOrEqual(after);
      });
    });

    describe('toRecord', () => {
      it('converts entity to database record', () => {
        const order = new Order(
          '123',
          'C1',
          [{ productId: 'P1', quantity: 2, price: 10 }],
          OrderStatus.PENDING,
          20,
          new Date('2025-01-01')
        );

        const record = order.toRecord();

        expect(record.id).toBe('123');
        expect(record.customer_id).toBe('C1');
        expect(record.status).toBe('pending');
        expect(record.total).toBe(20);
        expect(record.items).toBe(JSON.stringify([{ productId: 'P1', quantity: 2, price: 10 }]));
        expect(record.created_at).toBe('2025-01-01T00:00:00.000Z');
      });

      it('preserves nested item structure', () => {
        const items = [
          { productId: 'P1', quantity: 2, price: 10 },
          { productId: 'P2', quantity: 1, price: 15 }
        ];
        const order = new Order('123', 'C1', items, OrderStatus.PENDING, 35);

        const record = order.toRecord();
        const parsed = JSON.parse(record.items);

        expect(parsed).toEqual(items);
      });
    });

    describe('fromRecord', () => {
      it('converts database record back to entity', () => {
        const record = {
          id: '123',
          customer_id: 'C1',
          items: '[{"productId":"P1","quantity":2,"price":10}]',
          status: 'pending',
          total: 20,
          created_at: '2025-01-01T00:00:00.000Z'
        };

        const order = Order.fromRecord(record);

        expect(order.id).toBe('123');
        expect(order.customerId).toBe('C1');
        expect(order.status).toBe(OrderStatus.PENDING);
        expect(order.total).toBe(20);
        expect(order.items).toHaveLength(1);
        expect(order.items[0].productId).toBe('P1');
      });

      it('parses nested JSON items correctly', () => {
        const record = {
          id: '123',
          customer_id: 'C1',
          items: '[{"productId":"P1","quantity":2,"price":10},{"productId":"P2","quantity":1,"price":15}]',
          status: 'pending',
          total: 35,
          created_at: '2025-01-01T00:00:00.000Z'
        };

        const order = Order.fromRecord(record);

        expect(order.items).toHaveLength(2);
        expect(order.items[1].productId).toBe('P2');
      });

      it('preserves timestamps from record', () => {
        const record = {
          id: '123',
          customer_id: 'C1',
          items: '[]',
          status: 'pending',
          total: 0,
          created_at: '2024-06-15T10:30:00.000Z'
        };

        const order = Order.fromRecord(record);

        expect(order.createdAt).toEqual(new Date('2024-06-15T10:30:00.000Z'));
      });
    });

    describe('toResponse', () => {
      it('converts entity to API response', () => {
        const order = new Order(
          '123',
          'C1',
          [{ productId: 'P1', quantity: 2, price: 10 }],
          OrderStatus.PENDING,
          20
        );

        const response = order.toResponse();

        expect(response.id).toBe('123');
        expect(response.customerId).toBe('C1');
        expect(response.status).toBe('pending');
        expect(response.total).toBe(20);
        expect(response.items).toHaveLength(1);
      });

      it('includes calculated fields in response', () => {
        const order = new Order(
          '123',
          'C1',
          [{ productId: 'P1', quantity: 2, price: 10 }],
          OrderStatus.PENDING,
          20
        );

        const response = order.toResponse();

        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('customerId');
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('total');
        expect(response).toHaveProperty('createdAt');
      });
    });
  });

  describe('calculated properties', () => {
    it('calculates total from items correctly', () => {
      const order = new Order(
        '1',
        'C1',
        [
          { productId: 'P1', quantity: 2, price: 10 },
          { productId: 'P2', quantity: 1, price: 15 }
        ],
        OrderStatus.PENDING,
        35
      );

      // If total is recalculated
      const calculated = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      expect(calculated).toBe(35);
    });

    it('updates total when discount applied', () => {
      const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 100 }], OrderStatus.PENDING, 100);
      const discounted = order.applyDiscount(0.2);

      expect(discounted.total).toBe(80);
    });
  });

  describe('invariants', () => {
    it('maintains total consistency with items', () => {
      const items = [
        { productId: 'P1', quantity: 2, price: 10 },
        { productId: 'P2', quantity: 3, price: 5 }
      ];
      const expected = 2 * 10 + 3 * 5; // 35

      const order = new Order('1', 'C1', items, OrderStatus.PENDING, expected);

      const calculated = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      expect(order.total).toBe(calculated);
    });

    it('never allows negative total', () => {
      expect(() => {
        new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.PENDING, -10);
      }).toThrow('Total cannot be negative');
    });

    it('ensures status is always valid', () => {
      const order = new Order('1', 'C1', [{ productId: 'P1', quantity: 1, price: 10 }], OrderStatus.PENDING, 10);

      // All valid statuses should work
      expect(() => order.updateStatus(OrderStatus.SHIPPED)).not.toThrow();
      expect(() => order.updateStatus(OrderStatus.DELIVERED)).not.toThrow();
    });
  });
});
```

## Service Testing Strategy

Services orchestrate entities and repositories. Test the business workflow.

### What to Test

- Business workflow execution
- Orchestration of multiple entities
- Error propagation and handling
- Repository interaction patterns
- Validation and state transitions

### What NOT to Test

- Repository implementation details
- External API behavior
- Database queries
- Internal helper methods

### Service Test Structure

```typescript
describe('Service', () => {
  describe('business_workflow', () => {
    it('executes workflow with valid data', async () => {
      // Setup stubs
      // Execute workflow
      // Assert business outcome
    });

    it('handles error conditions', async () => {
      // Setup error state
      // Execute workflow
      // Assert error propagation
    });
  });
});
```

## Comprehensive Service Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderService } from './order-service';
import { OrderRepository } from './order-repository';
import { InventoryRepository } from './inventory-repository';
import { Order, OrderStatus } from './order';
import { Ok, Err } from './result';

describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepo: OrderRepository;
  let mockInventoryRepo: InventoryRepository;

  beforeEach(() => {
    mockOrderRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
      findByCustomerId: vi.fn()
    };

    mockInventoryRepo = {
      checkAvailability: vi.fn(),
      reserve: vi.fn(),
      release: vi.fn(),
      getStock: vi.fn()
    };

    service = new OrderService(mockOrderRepo, mockInventoryRepo);
  });

  describe('createOrder', () => {
    it('creates order with valid data', async () => {
      mockInventoryRepo.checkAvailability.mockResolvedValue({ available: true });
      mockOrderRepo.save.mockResolvedValue({
        id: '123',
        customer_id: 'C1',
        items: '[]',
        status: 'pending',
        total: 35
      });

      const result = await service.createOrder({
        customerId: 'C1',
        items: [
          { productId: 'P1', quantity: 2, price: 10 },
          { productId: 'P2', quantity: 1, price: 15 }
        ]
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.total).toBe(35);
      }
    });

    it('validates inventory before saving', async () => {
      mockInventoryRepo.checkAvailability.mockResolvedValue({ available: true });
      mockOrderRepo.save.mockResolvedValue({ id: '123', customer_id: 'C1', items: '[]', status: 'pending', total: 20 });

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

    it('does not save when inventory unavailable', async () => {
      mockInventoryRepo.checkAvailability.mockResolvedValue({ available: false, reason: 'P1 out of stock' });

      const result = await service.createOrder({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 100 }]
      });

      expect(result.ok).toBe(false);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('reserves inventory when order is created', async () => {
      mockInventoryRepo.checkAvailability.mockResolvedValue({ available: true });
      mockOrderRepo.save.mockResolvedValue({ id: '123', customer_id: 'C1', items: '[]', status: 'pending', total: 20 });

      await service.createOrder({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2 }]
      });

      expect(mockInventoryRepo.reserve).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ productId: 'P1', quantity: 2 })
        ])
      );
    });

    it('releases inventory if save fails', async () => {
      mockInventoryRepo.checkAvailability.mockResolvedValue({ available: true });
      mockOrderRepo.save.mockRejectedValue(new Error('Database error'));

      const result = await service.createOrder({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2 }]
      });

      expect(result.ok).toBe(false);
      expect(mockInventoryRepo.release).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('cancels pending order successfully', async () => {
      const orderRecord = {
        id: '123',
        customer_id: 'C1',
        items: '[{"productId":"P1","quantity":2,"price":10}]',
        status: 'pending',
        total: 20
      };

      mockOrderRepo.findById.mockResolvedValue(orderRecord);
      mockOrderRepo.save.mockResolvedValue({ ...orderRecord, status: 'cancelled' });

      const result = await service.cancelOrder('123');

      expect(result.ok).toBe(true);
      expect(mockOrderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' })
      );
    });

    it('releases inventory when cancelling', async () => {
      const orderRecord = {
        id: '123',
        customer_id: 'C1',
        items: '[{"productId":"P1","quantity":2,"price":10}]',
        status: 'pending',
        total: 20
      };

      mockOrderRepo.findById.mockResolvedValue(orderRecord);
      mockOrderRepo.save.mockResolvedValue({ ...orderRecord, status: 'cancelled' });

      await service.cancelOrder('123');

      expect(mockInventoryRepo.release).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ productId: 'P1', quantity: 2 })
        ])
      );
    });

    it('rejects cancelling shipped order', async () => {
      mockOrderRepo.findById.mockResolvedValue({
        id: '123',
        customer_id: 'C1',
        items: '[]',
        status: 'shipped',
        total: 0
      });

      const result = await service.cancelOrder('123');

      expect(result.ok).toBe(false);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('returns error for non-existent order', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      const result = await service.cancelOrder('999');

      expect(result.ok).toBe(false);
    });
  });

  describe('getOrder', () => {
    it('retrieves order by id', async () => {
      mockOrderRepo.findById.mockResolvedValue({
        id: '123',
        customer_id: 'C1',
        items: '[]',
        status: 'pending',
        total: 0
      });

      const result = await service.getOrder('123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('123');
      }
    });

    it('returns error for non-existent order', async () => {
      mockOrderRepo.findById.mockResolvedValue(null);

      const result = await service.getOrder('999');

      expect(result.ok).toBe(false);
    });
  });

  describe('getCustomerOrders', () => {
    it('retrieves all orders for customer', async () => {
      mockOrderRepo.findByCustomerId.mockResolvedValue([
        { id: '123', customer_id: 'C1', items: '[]', status: 'pending', total: 0 },
        { id: '124', customer_id: 'C1', items: '[]', status: 'delivered', total: 50 }
      ]);

      const result = await service.getCustomerOrders('C1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
      }
    });

    it('returns empty list for customer with no orders', async () => {
      mockOrderRepo.findByCustomerId.mockResolvedValue([]);

      const result = await service.getCustomerOrders('C999');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });
});
```
