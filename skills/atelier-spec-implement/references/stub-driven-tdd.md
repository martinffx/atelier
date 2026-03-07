# Stub-Driven TDD Workflow

Complete workflow examples showing the Stub → Test → Implement → Refactor pattern.

## The Four-Step Pattern

```
1. Stub   → Create minimal interface/function signatures
2. Test   → Write tests against stubs
3. Implement → Make tests pass with real implementation
4. Refactor  → Improve code while keeping tests green
```

## Why Stub-Driven?

**Traditional TDD problem:** Can't write tests until implementation exists

**Stub-Driven solution:** Write interface/type signatures first, test against those, then implement

**Benefits:**
- Tests define behavior before implementation
- Interfaces emerge from use cases, not speculation
- Refactoring is safe (tests validate behavior)
- Fast feedback loop (stub → test → implement)

## Complete Order Service Example

### Step 1: Stub

Define the interface and service class with stub methods:

```typescript
// Define repository interface from use case
interface OrderRepository {
  save(order: OrderRecord): Promise<OrderRecord>;
  findById(id: string): Promise<OrderRecord | null>;
  delete(id: string): Promise<void>;
}

// Service uses stub - methods throw NotImplemented
class OrderService {
  constructor(private repo: OrderRepository) {}

  async createOrder(request: CreateOrderRequest): Promise<Result<Order>> {
    throw new Error('Not implemented');
  }

  async cancelOrder(id: string): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async getOrder(id: string): Promise<Result<Order>> {
    throw new Error('Not implemented');
  }
}

// Export for testing
export { OrderService, OrderRepository };
```

### Step 2: Test

Write comprehensive tests against the stubs:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderService, OrderRepository } from './order-service';
import { CreateOrderRequest, OrderRecord, Order } from './order';
import { Ok, Err } from './result';

describe('OrderService', () => {
  let service: OrderService;
  let mockRepo: OrderRepository;

  beforeEach(() => {
    // Create stub implementation
    mockRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn()
    };
    service = new OrderService(mockRepo);
  });

  describe('createOrder', () => {
    it('should save valid order', async () => {
      mockRepo.save.mockResolvedValue({
        id: '123',
        customer_id: 'C1',
        items: '[]',
        status: 'pending',
        total: 0
      });

      const result = await service.createOrder({
        customerId: 'C1',
        items: [{ productId: 'P1', quantity: 2, price: 10 }]
      });

      expect(result.ok).toBe(true);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: 'C1',
          status: 'pending'
        })
      );
    });

    it('should validate order before saving', async () => {
      const result = await service.createOrder({
        customerId: 'C1',
        items: [] // Invalid: empty items
      });

      expect(result.ok).toBe(false);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should calculate total correctly', async () => {
      mockRepo.save.mockResolvedValue({
        id: '123',
        customer_id: 'C1',
        items: '[]',
        status: 'pending',
        total: 0
      });

      await service.createOrder({
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

  describe('cancelOrder', () => {
    it('should cancel pending order', async () => {
      mockRepo.findById.mockResolvedValue({
        id: '123',
        customer_id: 'C1',
        items: '[]',
        status: 'pending',
        total: 0
      });
      mockRepo.delete.mockResolvedValue(undefined);

      const result = await service.cancelOrder('123');

      expect(result.ok).toBe(true);
      expect(mockRepo.delete).toHaveBeenCalledWith('123');
    });

    it('should reject canceling shipped order', async () => {
      mockRepo.findById.mockResolvedValue({
        id: '123',
        customer_id: 'C1',
        items: '[]',
        status: 'shipped',
        total: 0
      });

      const result = await service.cancelOrder('123');

      expect(result.ok).toBe(false);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it('should reject canceling non-existent order', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.cancelOrder('999');

      expect(result.ok).toBe(false);
    });
  });

  describe('getOrder', () => {
    it('should retrieve order by id', async () => {
      mockRepo.findById.mockResolvedValue({
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

    it('should return error for non-existent order', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.getOrder('999');

      expect(result.ok).toBe(false);
    });
  });
});
```

### Step 3: Implement

Make tests pass with real implementation:

```typescript
class OrderService {
  constructor(private repo: OrderRepository) {}

  async createOrder(request: CreateOrderRequest): Promise<Result<Order>> {
    // Transform request to entity
    const order = Order.fromRequest(request);

    // Validate
    const validation = order.validate();
    if (!validation.ok) return validation;

    // Save to repository
    const record = order.toRecord();
    const saved = await this.repo.save(record);

    // Transform back to entity
    return Ok(Order.fromRecord(saved));
  }

  async cancelOrder(id: string): Promise<Result<void>> {
    // Find order
    const record = await this.repo.findById(id);
    if (!record) return Err('Order not found');

    // Transform to entity
    const order = Order.fromRecord(record);

    // Check business rule
    if (!order.canCancel()) {
      return Err(`Cannot cancel ${order.status} order`);
    }

    // Delete
    await this.repo.delete(id);
    return Ok(undefined);
  }

  async getOrder(id: string): Promise<Result<Order>> {
    // Find order
    const record = await this.repo.findById(id);
    if (!record) return Err('Order not found');

    // Transform to entity
    return Ok(Order.fromRecord(record));
  }
}
```

### Step 4: Refactor

Improve code while keeping tests green:

```typescript
class OrderService {
  constructor(private repo: OrderRepository) {}

  async createOrder(request: CreateOrderRequest): Promise<Result<Order>> {
    const order = Order.fromRequest(request);
    return await this.validateAndSave(order);
  }

  async cancelOrder(id: string): Promise<Result<void>> {
    const order = await this.findOrderOrError(id);
    if (!order.ok) return order;

    return await this.checkCancellableAndDelete(order.value);
  }

  async getOrder(id: string): Promise<Result<Order>> {
    return await this.findOrderOrError(id);
  }

  private async validateAndSave(order: Order): Promise<Result<Order>> {
    const validation = order.validate();
    if (!validation.ok) return validation;

    const record = order.toRecord();
    const saved = await this.repo.save(record);
    return Ok(Order.fromRecord(saved));
  }

  private async findOrderOrError(id: string): Promise<Result<Order>> {
    const record = await this.repo.findById(id);
    if (!record) return Err('Order not found');
    return Ok(Order.fromRecord(record));
  }

  private async checkCancellableAndDelete(order: Order): Promise<Result<void>> {
    if (!order.canCancel()) {
      return Err(`Cannot cancel ${order.status} order`);
    }
    await this.repo.delete(order.id);
    return Ok(undefined);
  }
}
```

All tests still pass after refactoring - behavior is unchanged, only implementation improved.

## Key Takeaways

1. **Start with stubs** - Define interfaces before implementation
2. **Test against contracts** - Test the interface, not the implementation
3. **Implement once tests are clear** - Make tests pass with real code
4. **Refactor with confidence** - Tests validate behavior doesn't change
5. **Keep feedback loop fast** - Each step is quick and focused
