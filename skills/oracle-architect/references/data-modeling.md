# Data Modeling Reference

Entity design principles, schema patterns, and access pattern optimization.

## Entity Design

### Design Process
1. Start with domain concepts from product requirements
2. Identify aggregates and their boundaries
3. Define attributes and relationships
4. Add validation rules and invariants
5. Include transformation methods (fromRequest, toRecord, toResponse)

### Entity Structure

**Core transformation methods:**
```typescript
class Order {
  // Create from external request
  static fromRequest(req: CreateOrderRequest): Order

  // Create from database record
  static fromRecord(record: OrderRecord): Order

  // Convert to database record
  toRecord(): OrderRecord

  // Convert to API response
  toResponse(): OrderResponse

  // Validate invariants
  validate(): Result<Order>
}
```

### Example Entity Design

```typescript
class Order {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly status: OrderStatus,
    public readonly total: number,
    public readonly createdAt: Date,
    public readonly metadata: OrderMetadata
  ) {}

  static fromRequest(req: CreateOrderRequest): Order {
    return new Order(
      generateId(),
      req.customerId,
      req.items.map(i => new OrderItem(i)),
      'pending',
      req.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      new Date(),
      { source: req.source || 'web' }
    );
  }

  toRecord(): OrderRecord {
    return {
      id: this.id,
      customer_id: this.customerId,
      items: JSON.stringify(this.items),
      status: this.status,
      total: this.total,
      created_at: this.createdAt.toISOString(),
      metadata: this.metadata
    };
  }

  toResponse(): OrderResponse {
    return {
      id: this.id,
      customerId: this.customerId,
      items: this.items,
      status: this.status,
      total: this.total,
      createdAt: this.createdAt.toISOString()
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
}
```

## Schema Patterns

### Relational Design

**Orders table:**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered')),
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
```

**Order items (normalized):**
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL,
  UNIQUE(order_id, product_id)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

### DynamoDB Single Table Design

**Items structure:**
```typescript
{
  PK: 'ORDER#123',
  SK: 'ORDER#123',
  type: 'Order',
  customerId: 'CUST#456',
  status: 'pending',
  total: 99.99,
  items: [...],
  createdAt: '2024-01-21T10:00:00Z',

  // GSI for customer lookup
  GSI1PK: 'CUST#456',
  GSI1SK: 'ORDER#2024-01-21T10:00:00Z',

  // GSI for status lookup
  GSI2PK: 'pending',
  GSI2SK: 'ORDER#2024-01-21T10:00:00Z'
}

{
  PK: 'ORDER#123',
  SK: 'ITEM#item-001',
  type: 'OrderItem',
  productId: 'PROD#999',
  quantity: 2,
  price: 49.99
}
```

**Key design:**
- PK = partition key (primary lookup)
- SK = sort key (range queries)
- GSI = global secondary index (alternative queries)

## Access Patterns

### Define Patterns First

List all data access patterns **before** designing schema:

1. **Find order by ID**
   - Query: `PK = ORDER#123, SK = ORDER#123`
   - Index: Primary key

2. **List orders by customer**
   - Query: `GSI1PK = CUST#456`
   - Index: Global secondary index

3. **List pending orders by date**
   - Query: `GSI2PK = pending, GSI2SK > date`
   - Index: Global secondary index sorted by date

4. **Count orders by status**
   - Query: Scan with filter (or GSI)
   - Performance: Consider status table

5. **Get recent orders for customer**
   - Query: `GSI1PK = CUST#456` sorted by date DESC
   - Index: Global secondary index

### Query Optimization

**N+1 Problem:**
```typescript
// BAD: N+1 queries
const orders = await orderRepo.findByCustomer(customerId);
const itemsPerOrder = await Promise.all(
  orders.map(o => itemRepo.findByOrder(o.id))  // N queries
);

// GOOD: Single query with denormalization
const orderData = await db.orders
  .where({ customerId })
  .select(['*', 'items']) // Includes denormalized items
  .sort({ createdAt: 'DESC' });
```

**Index Coverage:**
```sql
-- Bad: Full table scan
SELECT * FROM orders WHERE customer_id = $1;

-- Good: Index-covered query
CREATE INDEX idx_orders_customer_status
ON orders(customer_id, status);

SELECT * FROM orders
WHERE customer_id = $1 AND status = 'pending';
```

## Data Transformation Patterns

### Request → Entity → Record → Response Flow

```typescript
// 1. HTTP Request arrives
POST /orders
{
  "customerId": "cust-123",
  "items": [{ "productId": "prod-1", "quantity": 2 }]
}

// 2. Router parses to request type
const request: CreateOrderRequest = req.body;

// 3. Entity transforms from request (with ID generation)
const order = Order.fromRequest(request);

// 4. Entity validates business rules
const validation = order.validate();
if (!validation.ok) return error;

// 5. Service performs logic, uses repository
await repo.save(order.toRecord());

// 6. Repository converts to database record
{
  id: "order-abc",
  customer_id: "cust-123",
  items: "[...]",
  status: "pending",
  created_at: "2024-01-21T10:00:00Z"
}

// 7. Response converts from record
const response = order.toResponse();

// 8. HTTP Response sends
{
  "id": "order-abc",
  "customerId": "cust-123",
  "items": [...],
  "status": "pending"
}
```

### Transformation Considerations

**Immutability:**
```typescript
// Bad: Mutation during transform
toRecord(): OrderRecord {
  this.items.forEach(i => i.status = 'recorded');
  return { items: this.items };
}

// Good: No side effects
toRecord(): OrderRecord {
  return {
    items: this.items.map(i => ({
      ...i,
      // Transform properties as needed
    }))
  };
}
```

**Versioning:**
```typescript
// Handle multiple API versions
toResponse(version: 'v1' | 'v2'): OrderResponse {
  const base = {
    id: this.id,
    customerId: this.customerId,
    status: this.status
  };

  if (version === 'v2') {
    return { ...base, total: this.total };
  }
  return base;
}
```

**Partial Loading:**
```typescript
// Only load fields needed for the operation
async findOrderSummary(id: string): Promise<OrderSummary> {
  const record = await db.orders
    .select(['id', 'status', 'total'])
    .findOne({ id });
  return { id: record.id, status: record.status, total: record.total };
}
```
