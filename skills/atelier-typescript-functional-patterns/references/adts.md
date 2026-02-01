# Algebraic Data Types (ADTs) in TypeScript

Algebraic Data Types enable you to model complex domains precisely by composing types algebraically. TypeScript's union and intersection types provide the foundation for ADTs, allowing you to make illegal states unrepresentable.

## What Are ADTs?

ADTs come in two flavors:

1. **Sum Types (OR)** - A value is one of several variants (tagged unions, discriminated unions)
2. **Product Types (AND)** - A value contains all fields simultaneously (objects, tuples)

TypeScript supports both through union types (`|`) and object/tuple types.

## Sum Types (Tagged Unions)

A sum type represents "one of several possible variants." Each variant is distinct and mutually exclusive.

### Basic Pattern

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number }
```

The `kind` field is the **discriminant** (also called "tag"). It tells TypeScript which variant you have, enabling type narrowing.

### Pattern Matching with Exhaustiveness

Always use `switch` with `assertNever` to ensure you handle all cases:

```typescript
function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      // TypeScript knows: shape.radius exists
      return Math.PI * shape.radius ** 2
    case "rectangle":
      // TypeScript knows: shape.width and shape.height exist
      return shape.width * shape.height
    case "triangle":
      // TypeScript knows: shape.base and shape.height exist
      return (shape.base * shape.height) / 2
    default:
      // Compiler error if you add a new variant without handling it
      assertNever(shape)
  }
}

const assertNever = (x: never): never => {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`)
}
```

**Why this matters**: If you add a new `Shape` variant (e.g., `pentagon`), TypeScript will produce a compile error in `area()` until you handle it.

### Discriminant Field Conventions

Choose a consistent discriminant field name across your codebase:

- `kind` - Common in domain models
- `type` - Common in event systems
- `_tag` - Common in functional programming libraries (fp-ts, effect-ts)

```typescript
// Good: Consistent discriminant
type PaymentEvent =
  | { kind: "initiated"; amount: Cents }
  | { kind: "authorized"; authCode: string }
  | { kind: "settled"; ledgerId: string }

// Avoid: Mixed discriminants
type Bad =
  | { kind: "a"; data: string }
  | { type: "b"; info: number } // Different field name!
```

## Product Types (Objects and Tuples)

A product type contains multiple fields simultaneously. TypeScript objects and tuples are product types.

### Object Product Type

```typescript
type User = {
  id: string
  email: string
  role: "admin" | "user"
  createdAt: Date
}

// User has ALL four fields
const user: User = {
  id: "u123",
  email: "alice@example.com",
  role: "admin",
  createdAt: new Date(),
}
```

### Tuple Product Type

```typescript
type Coordinate = [number, number] // x and y

const point: Coordinate = [10, 20]
const [x, y] = point // Destructuring
```

## Combining Sum and Product Types

Real-world domains often combine both:

```typescript
type PaymentMethod =
  | { kind: "card"; last4: string; brand: string; expiryMonth: number; expiryYear: number }
  | { kind: "ach"; accountNumber: string; routingNumber: string; bankName: string }
  | { kind: "wallet"; provider: "apple" | "google"; deviceId: string }
```

Each variant (sum type) contains multiple fields (product type).

## Real-World Example: Transaction States

Model a transaction lifecycle as a state machine:

```typescript
type Millis = number & { __brand: "Millis" }
type Cents = number & { __brand: "Cents" }

type TxnState =
  | { kind: "pending"; createdAt: Millis }
  | { kind: "authorized"; authCode: string; authorizedAt: Millis }
  | { kind: "settled"; ledgerId: string; settledAt: Millis }
  | { kind: "failed"; reason: FailureReason; failedAt: Millis }
  | { kind: "reversed"; originalLedgerId: string; reversedAt: Millis }

type FailureReason =
  | { kind: "insufficient_funds" }
  | { kind: "invalid_account" }
  | { kind: "network_error"; retryable: boolean }

function canReverse(state: TxnState): boolean {
  switch (state.kind) {
    case "pending":
      return false
    case "authorized":
      return false
    case "settled":
      return true // Only settled transactions can be reversed
    case "failed":
      return false
    case "reversed":
      return false // Already reversed
    default:
      assertNever(state)
  }
}

function isTerminal(state: TxnState): boolean {
  switch (state.kind) {
    case "pending":
      return false
    case "authorized":
      return false
    case "settled":
      return true
    case "failed":
      return true
    case "reversed":
      return true
    default:
      assertNever(state)
  }
}
```

**Benefits:**
- Impossible states (e.g., "pending transaction with ledgerId") cannot be represented
- State transitions are explicit in code
- Adding new states forces you to update all pattern matches

## Real-World Example: Payment Methods

```typescript
type PaymentMethod =
  | { kind: "card"; last4: string; brand: string }
  | { kind: "ach"; accountNumber: string; routingNumber: string }
  | { kind: "wallet"; provider: "apple" | "google" }

function formatPaymentMethod(method: PaymentMethod): string {
  switch (method.kind) {
    case "card":
      return `${method.brand} ending in ${method.last4}`
    case "ach":
      return `Bank account ending in ${method.accountNumber.slice(-4)}`
    case "wallet":
      return `${method.provider} Pay`
    default:
      assertNever(method)
  }
}

function isCardPayment(method: PaymentMethod): boolean {
  return method.kind === "card"
}
```

## Real-World Example: Call Session States

Model telephony call session states:

```typescript
type CallSession =
  | { state: "idle" }
  | { state: "ringing"; callerId: string; startedAt: Millis }
  | { state: "active"; callerId: string; answeredAt: Millis }
  | { state: "hold"; callerId: string; heldAt: Millis }
  | { state: "ended"; callerId: string; duration: Millis; endReason: EndReason }

type EndReason =
  | { kind: "hangup"; initiator: "caller" | "callee" }
  | { kind: "timeout" }
  | { kind: "error"; code: string }

function canTransferCall(session: CallSession): boolean {
  switch (session.state) {
    case "idle":
      return false
    case "ringing":
      return false
    case "active":
      return true // Only active calls can be transferred
    case "hold":
      return true // Calls on hold can be transferred
    case "ended":
      return false
    default:
      assertNever(session)
  }
}
```

## Type Narrowing Techniques

TypeScript provides several ways to narrow sum types:

### 1. Switch Statement (Recommended)

```typescript
switch (shape.kind) {
  case "circle":
    return Math.PI * shape.radius ** 2
  // ... other cases
}
```

### 2. If-Else Chain

```typescript
if (shape.kind === "circle") {
  return Math.PI * shape.radius ** 2
} else if (shape.kind === "rectangle") {
  return shape.width * shape.height
} else if (shape.kind === "triangle") {
  return (shape.base * shape.height) / 2
} else {
  assertNever(shape)
}
```

### 3. Early Return Pattern

```typescript
function area(shape: Shape): number {
  if (shape.kind === "circle") {
    return Math.PI * shape.radius ** 2
  }
  if (shape.kind === "rectangle") {
    return shape.width * shape.height
  }
  if (shape.kind === "triangle") {
    return (shape.base * shape.height) / 2
  }
  assertNever(shape)
}
```

### 4. Type Guards

```typescript
function isCircle(shape: Shape): shape is Extract<Shape, { kind: "circle" }> {
  return shape.kind === "circle"
}

if (isCircle(shape)) {
  console.log(shape.radius) // Type-safe
}
```

## Nested Sum Types

Sum types can be nested for complex domains:

```typescript
type ApiResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: ApiError }

type ApiError =
  | { kind: "validation"; fields: Record<string, string[]> }
  | { kind: "auth"; message: string }
  | { kind: "network"; retryable: boolean }
  | { kind: "server"; statusCode: number }

function handleResponse<T>(response: ApiResponse<T>): void {
  switch (response.status) {
    case "success":
      console.log(response.data)
      break
    case "error":
      switch (response.error.kind) {
        case "validation":
          console.error("Validation errors:", response.error.fields)
          break
        case "auth":
          console.error("Auth error:", response.error.message)
          break
        case "network":
          if (response.error.retryable) {
            console.log("Retrying...")
          }
          break
        case "server":
          console.error("Server error:", response.error.statusCode)
          break
        default:
          assertNever(response.error)
      }
      break
    default:
      assertNever(response)
  }
}
```

## Generic Sum Types

Use generics to create reusable sum type patterns:

```typescript
type RemoteData<T, E> =
  | { status: "not-asked" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "failure"; error: E }

// Usage
type UserProfile = RemoteData<User, string>

function renderProfile(profile: UserProfile): string {
  switch (profile.status) {
    case "not-asked":
      return "Click to load"
    case "loading":
      return "Loading..."
    case "success":
      return `Welcome, ${profile.data.email}`
    case "failure":
      return `Error: ${profile.error}`
    default:
      assertNever(profile)
  }
}
```

## Common Patterns

### Boolean Elimination

Replace boolean flags with explicit states:

```typescript
// Bad: Boolean soup
type Order = {
  id: string
  isPaid: boolean
  isShipped: boolean
  isCancelled: boolean
}
// What does { isPaid: true, isCancelled: true } mean?

// Good: Explicit states
type OrderStatus =
  | { kind: "pending" }
  | { kind: "paid"; paidAt: Date }
  | { kind: "shipped"; trackingNumber: string; shippedAt: Date }
  | { kind: "delivered"; deliveredAt: Date }
  | { kind: "cancelled"; reason: string; cancelledAt: Date }

type Order = {
  id: string
  status: OrderStatus
}
```

### State Transitions

Encode valid state transitions in types:

```typescript
type TxnState =
  | { kind: "pending" }
  | { kind: "settled"; ledgerId: string }
  | { kind: "failed"; reason: string }

function settle(state: TxnState, ledgerId: string): TxnState {
  if (state.kind !== "pending") {
    throw new Error("Can only settle pending transactions")
  }
  return { kind: "settled", ledgerId }
}

function fail(state: TxnState, reason: string): TxnState {
  if (state.kind !== "pending") {
    throw new Error("Can only fail pending transactions")
  }
  return { kind: "failed", reason }
}
```

## Best Practices

1. **Use consistent discriminant names** (`kind`, `type`, or `_tag`)
2. **Always include `assertNever` in default case** for exhaustiveness
3. **Prefer sum types over boolean flags** for state modeling
4. **Make illegal states unrepresentable** through type design
5. **Use nested sum types** for complex error hierarchies
6. **Document state transitions** in comments or type definitions
7. **Leverage generics** for reusable patterns (RemoteData, Result, etc.)

## Testing ADTs

Test each variant and all edge cases:

```typescript
describe("area", () => {
  it("calculates circle area", () => {
    const circle: Shape = { kind: "circle", radius: 10 }
    expect(area(circle)).toBeCloseTo(314.159)
  })

  it("calculates rectangle area", () => {
    const rect: Shape = { kind: "rectangle", width: 5, height: 10 }
    expect(area(rect)).toBe(50)
  })

  it("calculates triangle area", () => {
    const triangle: Shape = { kind: "triangle", base: 10, height: 5 }
    expect(area(triangle)).toBe(25)
  })
})
```

## Migration from Booleans

Before:
```typescript
type User = {
  id: string
  isActive: boolean
  isBanned: boolean
  isEmailVerified: boolean
}
// What does { isActive: true, isBanned: true } mean?
```

After:
```typescript
type UserStatus =
  | { kind: "pending-verification"; email: string }
  | { kind: "active" }
  | { kind: "banned"; reason: string; bannedAt: Date }
  | { kind: "deactivated"; deactivatedAt: Date }

type User = {
  id: string
  status: UserStatus
}
```

## Further Reading

- [Option & Result](./option-result.md) - Type-safe error handling patterns
- [Branded Types](./branded-types.md) - Smart constructors and nominal typing
- [Migration Guide](./migration-guide.md) - Step-by-step adoption playbook
