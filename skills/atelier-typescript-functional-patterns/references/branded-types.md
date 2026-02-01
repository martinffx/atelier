# Branded Types and Smart Constructors

Branded types (also called nominal types or opaque types) prevent mixing semantically different values that share the same primitive type. They use smart constructors to enforce invariants at creation time.

## The Problem: Primitive Obsession

TypeScript uses structural typing - two types with the same structure are compatible:

```typescript
type UserId = string
type OrderId = string

function getUser(id: UserId): User { /* ... */ }

const orderId: OrderId = "ord_123"
getUser(orderId) // Compiles! But logically wrong
```

The compiler allows passing an `OrderId` where a `UserId` is expected because both are `string`.

**Common issues:**
- Mixing units (cents vs dollars, seconds vs milliseconds)
- Mixing IDs (UserId vs OrderId vs ProductId)
- Using unvalidated values (raw email string vs validated Email)

## The Brand Pattern

Add a phantom brand property to create nominal types:

```typescript
type Brand<K, T> = K & { __brand: T }

type UserId = Brand<string, "UserId">
type OrderId = Brand<string, "OrderId">

function getUser(id: UserId): User { /* ... */ }

const orderId: OrderId = "ord_123" as OrderId
getUser(orderId) // Type error! OrderId is not assignable to UserId
```

The `__brand` property exists only at compile time. At runtime, branded types are just their base types.

## Smart Constructors

Smart constructors enforce invariants and create branded values:

```typescript
type Email = Brand<string, "Email">

const Email = (s: string): Email => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    throw new Error("Invalid email format")
  }
  return s as Email
}

// Usage
const email = Email("alice@example.com") // OK
const invalid = Email("not-an-email") // Throws error
```

**Benefits:**
- Validation happens once at construction
- Invalid values can't be created
- Type system proves all Email values are valid

## Common Branded Type Patterns

### Financial Units (Prevent Floating Point Errors)

```typescript
type Cents = Brand<number, "Cents">
type Dollars = Brand<number, "Dollars">

const Cents = (n: number): Cents => {
  if (!Number.isInteger(n)) {
    throw new Error("Cents must be integer")
  }
  if (n < 0) {
    throw new Error("Cents cannot be negative")
  }
  return n as Cents
}

const Dollars = (n: number): Dollars => {
  if (n < 0) {
    throw new Error("Dollars cannot be negative")
  }
  return n as Dollars
}

// Convert between units
const dollarsFromCents = (cents: Cents): Dollars => {
  return Dollars(cents / 100)
}

const centsFromDollars = (dollars: Dollars): Cents => {
  return Cents(Math.round(dollars * 100))
}

// Type-safe arithmetic
const addCents = (a: Cents, b: Cents): Cents => Cents(a + b)
const subtractCents = (a: Cents, b: Cents): Cents => Cents(a - b)

// Usage
const price = Cents(1000) // $10.00
const tax = Cents(100)    // $1.00
const total = addCents(price, tax) // Cents(1100)

const inDollars = dollarsFromCents(total) // Dollars(11)

// This won't compile:
const wrong = Cents(10) + Dollars(5) // Type error!
```

### Time Units (Prevent Unit Confusion)

```typescript
type Millis = Brand<number, "Millis">
type Seconds = Brand<number, "Seconds">

const Millis = (n: number): Millis => {
  if (n < 0) throw new Error("Millis cannot be negative")
  return n as Millis
}

const Seconds = (n: number): Seconds => {
  if (n < 0) throw new Error("Seconds cannot be negative")
  return n as Seconds
}

const secondsFromMillis = (ms: Millis): Seconds => Seconds(ms / 1000)
const millisFromSeconds = (s: Seconds): Millis => Millis(s * 1000)

// Usage
const timeout = Millis(5000)
const wait = Seconds(5)

setTimeout(() => console.log("Done"), timeout) // OK
setTimeout(() => console.log("Done"), wait)    // Type error!
```

### Validated IDs

```typescript
type UserId = Brand<string, "UserId">
type OrderId = Brand<string, "OrderId">
type ProductId = Brand<string, "ProductId">

const UserId = (s: string): UserId => {
  if (!/^usr_[a-zA-Z0-9]+$/.test(s)) {
    throw new Error("Invalid UserId format")
  }
  return s as UserId
}

const OrderId = (s: string): OrderId => {
  if (!/^ord_[a-zA-Z0-9]+$/.test(s)) {
    throw new Error("Invalid OrderId format")
  }
  return s as OrderId
}

// Functions are type-safe
function getUser(id: UserId): User { /* ... */ }
function getOrder(id: OrderId): Order { /* ... */ }

const userId = UserId("usr_123")
const orderId = OrderId("ord_456")

getUser(userId)   // OK
getUser(orderId)  // Type error! OrderId is not UserId
```

### Email Addresses

```typescript
type Email = Brand<string, "Email">

const Email = (s: string): Email => {
  const trimmed = s.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("Invalid email format")
  }
  return trimmed as Email
}

// Email is always validated and normalized
function sendEmail(to: Email, subject: string, body: string): void {
  // No need to validate 'to' - type guarantees it's valid
}

const email = Email("Alice@Example.com") // Normalized to "alice@example.com"
sendEmail(email, "Hello", "World")
```

### Non-Empty Strings

```typescript
type NonEmptyString = Brand<string, "NonEmptyString">

const NonEmptyString = (s: string): NonEmptyString => {
  if (s.length === 0) {
    throw new Error("String cannot be empty")
  }
  return s as NonEmptyString
}

type User = {
  id: UserId
  name: NonEmptyString // Guaranteed never empty
  email: Email         // Guaranteed valid format
}
```

### Positive Numbers

```typescript
type PositiveInt = Brand<number, "PositiveInt">
type PositiveFloat = Brand<number, "PositiveFloat">

const PositiveInt = (n: number): PositiveInt => {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("Must be positive integer")
  }
  return n as PositiveInt
}

const PositiveFloat = (n: number): PositiveFloat => {
  if (n <= 0) {
    throw new Error("Must be positive number")
  }
  return n as PositiveFloat
}

// Usage: Quantity must be positive integer
type CartItem = {
  productId: ProductId
  quantity: PositiveInt
  price: Cents
}
```

### URL and URI

```typescript
type Url = Brand<string, "Url">
type Uri = Brand<string, "Uri">

const Url = (s: string): Url => {
  try {
    new URL(s) // Validates URL format
    return s as Url
  } catch {
    throw new Error("Invalid URL")
  }
}

const Uri = (s: string): Uri => {
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) {
    throw new Error("Invalid URI format")
  }
  return s as Uri
}

function fetchData(url: Url): Promise<Response> {
  // Guaranteed 'url' is valid URL
  return fetch(url)
}
```

## Result-Returning Smart Constructors

For user input validation, return `Result` instead of throwing:

```typescript
import { Result, Ok, Err } from "./result"

type Email = Brand<string, "Email">

const Email = {
  // Throwing version for internal use
  unsafe: (s: string): Email => {
    const trimmed = s.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new Error("Invalid email format")
    }
    return trimmed as Email
  },

  // Result version for external input
  parse: (s: string): Result<Email, string> => {
    try {
      return Ok(Email.unsafe(s))
    } catch (e) {
      return Err("Invalid email format")
    }
  },
}

// Usage
const emailResult = Email.parse(userInput)
switch (emailResult._tag) {
  case "Ok":
    saveUser({ email: emailResult.value })
    break
  case "Err":
    showError(emailResult.error)
    break
}
```

## Advanced Patterns

### Multiple Brands

Combine multiple brands for stronger guarantees:

```typescript
type Positive = Brand<number, "Positive">
type Integer = Brand<number, "Integer">
type PositiveInt = Positive & Integer

const PositiveInt = (n: number): PositiveInt => {
  if (!Number.isInteger(n)) throw new Error("Must be integer")
  if (n <= 0) throw new Error("Must be positive")
  return n as PositiveInt
}
```

### Generic Branded Collections

```typescript
type NonEmptyArray<T> = Brand<T[], "NonEmptyArray">

const NonEmptyArray = <T>(arr: T[]): NonEmptyArray<T> => {
  if (arr.length === 0) {
    throw new Error("Array cannot be empty")
  }
  return arr as NonEmptyArray<T>
}

// Safe head/tail operations
const head = <T>(arr: NonEmptyArray<T>): T => arr[0]
const tail = <T>(arr: NonEmptyArray<T>): T[] => arr.slice(1)

const numbers = NonEmptyArray([1, 2, 3])
const first = head(numbers) // No need to check undefined
```

### Range-Constrained Numbers

```typescript
type Percentage = Brand<number, "Percentage">

const Percentage = (n: number): Percentage => {
  if (n < 0 || n > 100) {
    throw new Error("Percentage must be 0-100")
  }
  return n as Percentage
}

type Port = Brand<number, "Port">

const Port = (n: number): Port => {
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error("Port must be 1-65535")
  }
  return n as Port
}
```

### JSON-Safe Branded Types

```typescript
type UserId = Brand<string, "UserId">

// Serialization
function userIdToJSON(id: UserId): string {
  return id // Just a string at runtime
}

// Deserialization (with validation)
function userIdFromJSON(json: string): Result<UserId, string> {
  if (!/^usr_[a-zA-Z0-9]+$/.test(json)) {
    return Err("Invalid UserId format")
  }
  return Ok(json as UserId)
}
```

## Testing Branded Types

```typescript
describe("Email", () => {
  it("accepts valid email", () => {
    expect(() => Email("alice@example.com")).not.toThrow()
  })

  it("rejects invalid email", () => {
    expect(() => Email("not-an-email")).toThrow("Invalid email format")
  })

  it("normalizes email", () => {
    const email = Email("Alice@Example.COM")
    expect(email).toBe("alice@example.com")
  })

  it("trims whitespace", () => {
    const email = Email("  alice@example.com  ")
    expect(email).toBe("alice@example.com")
  })
})

describe("Cents", () => {
  it("rejects non-integers", () => {
    expect(() => Cents(10.5)).toThrow("Cents must be integer")
  })

  it("rejects negative values", () => {
    expect(() => Cents(-100)).toThrow("Cents cannot be negative")
  })

  it("allows zero", () => {
    expect(() => Cents(0)).not.toThrow()
  })
})
```

## Integration with Domain Models

```typescript
type Money = Brand<number, "Money"> // Always in cents

type User = {
  id: UserId
  email: Email
  name: NonEmptyString
  createdAt: Millis
}

type Order = {
  id: OrderId
  userId: UserId
  items: NonEmptyArray<OrderItem>
  total: Money
  createdAt: Millis
}

type OrderItem = {
  productId: ProductId
  quantity: PositiveInt
  pricePerUnit: Money
}

// All invariants enforced at type level:
// - IDs are validated and can't be mixed
// - Email is valid format
// - Name is never empty
// - Orders always have at least one item
// - Quantities are positive integers
// - Money is always in cents (no float errors)
```

## Best Practices

1. **Use smart constructors for all branded types**
   - Enforce invariants at creation time
   - Never cast directly to branded type in application code

2. **Provide both throwing and Result versions**
   - Throwing for internal code (programmer error if invalid)
   - Result for external input (user error expected)

3. **Document invariants**
   ```typescript
   /**
    * Cents - Money amount in integer cents (prevents floating point errors)
    * Invariants:
    * - Must be integer (no fractional cents)
    * - Must be non-negative
    */
   type Cents = Brand<number, "Cents">
   ```

4. **Use branded types in domain models**
   - Replace primitive types with branded types in entities
   - Make illegal states unrepresentable

5. **Provide conversion functions between units**
   ```typescript
   const dollarsFromCents = (cents: Cents): Dollars => Dollars(cents / 100)
   const centsFromDollars = (dollars: Dollars): Cents => Cents(dollars * 100)
   ```

6. **Test smart constructor validation**
   - Test valid inputs don't throw
   - Test invalid inputs throw with correct message
   - Test normalization (trim, lowercase, etc.)

7. **Consider runtime brand checking for untrusted data**
   ```typescript
   function isCents(value: unknown): value is Cents {
     return typeof value === "number" && Number.isInteger(value) && value >= 0
   }
   ```

## Common Use Cases

### Financial Systems
- `Cents` - Integer cents (no float errors)
- `Dollars` - Dollar amounts
- `BasisPoints` - Fee percentages (1 bps = 0.01%)

### Time/Duration
- `Millis` - Milliseconds since epoch
- `Seconds` - Seconds
- `IsoDateString` - ISO 8601 date string

### Identifiers
- `UserId`, `OrderId`, `ProductId` - Prevent ID confusion
- `SessionToken` - Validated token format
- `ApiKey` - Validated API key

### Validated Strings
- `Email` - Valid email format
- `Url` - Valid URL format
- `PhoneNumber` - Valid phone format
- `NonEmptyString` - Never empty

### Numeric Constraints
- `PositiveInt` - Integer > 0
- `NonNegativeInt` - Integer >= 0
- `Percentage` - 0-100
- `Port` - 1-65535

## Further Reading

- [ADTs](./adts.md) - Algebraic Data Types and discriminated unions
- [Option & Result](./option-result.md) - Type-safe error handling
- [Migration Guide](./migration-guide.md) - Step-by-step adoption playbook
