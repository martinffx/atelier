# Effect Schema

Effect Schema is a powerful library for defining, validating, and transforming data structures with full TypeScript type inference.

## Basic Schemas

### Primitive Types

```typescript
import { Schema } from "effect"

// Basic primitives
const str = Schema.String        // Schema<string>
const num = Schema.Number        // Schema<number>
const bool = Schema.Boolean      // Schema<boolean>
const bigint = Schema.BigInt     // Schema<bigint>

// Literals
const literal = Schema.Literal("active", "inactive")
// Schema<"active" | "inactive">

// Unknown and Any
const unknown = Schema.Unknown   // Schema<unknown>
const any = Schema.Any           // Schema<any>

// Void and Undefined
const voidSchema = Schema.Void
const undef = Schema.Undefined
const nil = Schema.Null
```

### Objects (Struct)

```typescript
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  age: Schema.Number,
  isActive: Schema.Boolean
})

// Infer TypeScript type
type User = Schema.Schema.Type<typeof User>
// { id: string; name: string; email: string; age: number; isActive: boolean }
```

### Optional Fields

```typescript
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  bio: Schema.optional(Schema.String),           // string | undefined
  age: Schema.optional(Schema.Number, { exact: true }), // number | undefined (no null)
  nickname: Schema.optionalWith(Schema.String, { default: () => "Anonymous" })
})

// With default value
const Config = Schema.Struct({
  host: Schema.String,
  port: Schema.optionalWith(Schema.Number, { default: () => 3000 }),
  debug: Schema.optionalWith(Schema.Boolean, { default: () => false })
})
```

### Arrays and Tuples

```typescript
import { Schema } from "effect"

// Array
const Numbers = Schema.Array(Schema.Number)
// Schema<number[]>

// Non-empty array
const NonEmptyNumbers = Schema.NonEmptyArray(Schema.Number)
// Schema<[number, ...number[]]>

// Tuple
const Point = Schema.Tuple(Schema.Number, Schema.Number)
// Schema<[number, number]>

// Tuple with rest
const Args = Schema.Tuple(
  [Schema.String],           // First element
  Schema.Number              // Rest elements
)
// Schema<[string, ...number[]]>
```

### Unions

```typescript
import { Schema } from "effect"

// Union of schemas
const StringOrNumber = Schema.Union(Schema.String, Schema.Number)
// Schema<string | number>

// Discriminated union
const Shape = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("circle"),
    radius: Schema.Number
  }),
  Schema.Struct({
    type: Schema.Literal("rectangle"),
    width: Schema.Number,
    height: Schema.Number
  })
)
// Schema<{ type: "circle"; radius: number } | { type: "rectangle"; width: number; height: number }>
```

### Records

```typescript
import { Schema } from "effect"

// Record with string keys
const StringRecord = Schema.Record({
  key: Schema.String,
  value: Schema.Number
})
// Schema<Record<string, number>>

// Record with literal keys
const StatusCounts = Schema.Record({
  key: Schema.Literal("active", "inactive", "pending"),
  value: Schema.Number
})
// Schema<Record<"active" | "inactive" | "pending", number>>
```

## Decoding and Encoding

### Synchronous Decoding

```typescript
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  age: Schema.Number
})

// Decode unknown data (throws on failure)
const user = Schema.decodeUnknownSync(User)({
  id: "123",
  name: "Alice",
  age: 30
})
// { id: "123", name: "Alice", age: 30 }

// Throws ParseError on invalid data
try {
  Schema.decodeUnknownSync(User)({ id: 123 }) // id should be string
} catch (e) {
  console.log(e) // ParseError
}
```

### Effect-based Decoding

```typescript
import { Schema, Effect } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String
})

// Returns Effect<User, ParseError, never>
const decode = Schema.decodeUnknown(User)

const program = Effect.gen(function* () {
  const user = yield* decode({ id: "123", name: "Alice" })
  return user
})
```

### Either-based Decoding

```typescript
import { Schema, Either } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String
})

// Returns Either<User, ParseError>
const result = Schema.decodeUnknownEither(User)({
  id: "123",
  name: "Alice"
})

if (Either.isRight(result)) {
  console.log(result.right) // User
} else {
  console.log(result.left)  // ParseError
}
```

### Encoding

```typescript
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.Date // Encodes to ISO string
})

type User = Schema.Schema.Type<typeof User>
// { id: string; createdAt: Date }

type UserEncoded = Schema.Schema.Encoded<typeof User>
// { id: string; createdAt: string }

const user: User = { id: "123", createdAt: new Date() }

// Encode to serializable form
const encoded = Schema.encodeSync(User)(user)
// { id: "123", createdAt: "2024-01-15T..." }
```

## Transformations

### Built-in Transformations

```typescript
import { Schema } from "effect"

// String to Number
const NumberFromString = Schema.NumberFromString
Schema.decodeUnknownSync(NumberFromString)("42") // 42

// Date from string
const DateFromString = Schema.Date
Schema.decodeUnknownSync(DateFromString)("2024-01-15") // Date object

// Trim whitespace
const Trimmed = Schema.Trimmed
Schema.decodeUnknownSync(Trimmed)("  hello  ") // "hello"

// Lowercase
const Lowercased = Schema.Lowercased
Schema.decodeUnknownSync(Lowercased)("HELLO") // "hello"
```

### Custom Transformations

```typescript
import { Schema } from "effect"

// Transform between encoded and decoded types
const Cents = Schema.transform(
  Schema.Number,        // From (encoded)
  Schema.Number,        // To (decoded)
  {
    decode: (n) => Math.round(n * 100), // dollars to cents
    encode: (n) => n / 100              // cents to dollars
  }
)

const price = Schema.decodeUnknownSync(Cents)(19.99) // 1999
const encoded = Schema.encodeSync(Cents)(1999)       // 19.99
```

### Transform with Effects

```typescript
import { Schema, Effect } from "effect"

// Async transformation
const UserFromId = Schema.transformOrFail(
  Schema.String,
  Schema.Struct({ id: Schema.String, name: Schema.String }),
  {
    decode: (id) => Effect.tryPromise({
      try: () => fetchUser(id),
      catch: () => new Error(`User not found: ${id}`)
    }),
    encode: (user) => Effect.succeed(user.id)
  }
)
```

## Refinements and Filters

### Built-in Refinements

```typescript
import { Schema } from "effect"

// String refinements
const NonEmpty = Schema.NonEmptyString
const Email = Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
const MinLength = Schema.String.pipe(Schema.minLength(3))
const MaxLength = Schema.String.pipe(Schema.maxLength(100))

// Number refinements
const Positive = Schema.Number.pipe(Schema.positive())
const NonNegative = Schema.Number.pipe(Schema.nonNegative())
const Int = Schema.Number.pipe(Schema.int())
const Between = Schema.Number.pipe(Schema.between(1, 100))

// Array refinements
const NonEmptyArray = Schema.Array(Schema.String).pipe(Schema.minItems(1))
const MaxItems = Schema.Array(Schema.Number).pipe(Schema.maxItems(10))
```

### Custom Refinements

```typescript
import { Schema } from "effect"

// Filter with predicate
const EvenNumber = Schema.Number.pipe(
  Schema.filter((n) => n % 2 === 0, {
    message: () => "Expected even number"
  })
)

// Brand for nominal typing
const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = Schema.Schema.Type<typeof UserId>
// string & Brand<"UserId">

const OrderId = Schema.String.pipe(Schema.brand("OrderId"))
type OrderId = Schema.Schema.Type<typeof OrderId>

// Cannot mix: userId = orderId would be type error
```

## Common Patterns

### API Request/Response Schemas

```typescript
import { Schema } from "effect"

// Request schema
const CreateUserRequest = Schema.Struct({
  name: Schema.NonEmptyString,
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  ),
  age: Schema.Number.pipe(Schema.int(), Schema.between(0, 150))
})

// Response schema (includes generated fields)
const UserResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  age: Schema.Number,
  createdAt: Schema.Date
})

// List response with pagination
const UsersListResponse = Schema.Struct({
  data: Schema.Array(UserResponse),
  total: Schema.Number,
  page: Schema.Number,
  pageSize: Schema.Number
})
```

### Configuration Schema

```typescript
import { Schema } from "effect"

const DatabaseConfig = Schema.Struct({
  host: Schema.NonEmptyString,
  port: Schema.Number.pipe(Schema.int(), Schema.between(1, 65535)),
  database: Schema.NonEmptyString,
  username: Schema.NonEmptyString,
  password: Schema.NonEmptyString,
  ssl: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  poolSize: Schema.optionalWith(
    Schema.Number.pipe(Schema.int(), Schema.positive()),
    { default: () => 10 }
  )
})

const AppConfig = Schema.Struct({
  env: Schema.Literal("development", "staging", "production"),
  port: Schema.Number.pipe(Schema.int(), Schema.between(1, 65535)),
  database: DatabaseConfig,
  logLevel: Schema.optionalWith(
    Schema.Literal("debug", "info", "warn", "error"),
    { default: () => "info" as const }
  )
})
```

### Discriminated Union for Events

```typescript
import { Schema } from "effect"

const UserCreated = Schema.Struct({
  type: Schema.Literal("UserCreated"),
  userId: Schema.String,
  email: Schema.String,
  timestamp: Schema.Date
})

const UserUpdated = Schema.Struct({
  type: Schema.Literal("UserUpdated"),
  userId: Schema.String,
  changes: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  timestamp: Schema.Date
})

const UserDeleted = Schema.Struct({
  type: Schema.Literal("UserDeleted"),
  userId: Schema.String,
  timestamp: Schema.Date
})

const UserEvent = Schema.Union(UserCreated, UserUpdated, UserDeleted)
type UserEvent = Schema.Schema.Type<typeof UserEvent>

// Handle events with exhaustive matching
const handleEvent = (event: UserEvent) => {
  switch (event.type) {
    case "UserCreated":
      return `User ${event.userId} created`
    case "UserUpdated":
      return `User ${event.userId} updated`
    case "UserDeleted":
      return `User ${event.userId} deleted`
  }
}
```

### Extend and Compose Schemas

```typescript
import { Schema } from "effect"

// Base schema
const BaseEntity = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.Date,
  updatedAt: Schema.Date
})

// Extend with additional fields
const User = Schema.Struct({
  ...BaseEntity.fields,
  name: Schema.String,
  email: Schema.String
})

// Pick specific fields
const UserSummary = Schema.pick(User, "id", "name")
// Schema<{ id: string; name: string }>

// Omit specific fields
const UserWithoutDates = Schema.omit(User, "createdAt", "updatedAt")
// Schema<{ id: string; name: string; email: string }>

// Make all fields optional
const PartialUser = Schema.partial(User)
// Schema<{ id?: string; name?: string; ... }>
```

## Error Handling

### Parse Errors

```typescript
import { Schema, Either } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  age: Schema.Number.pipe(Schema.positive())
})

const result = Schema.decodeUnknownEither(User)({
  id: 123,  // Wrong type
  age: -5   // Negative
})

if (Either.isLeft(result)) {
  // Access detailed error information
  const error = result.left
  console.log(error.message)
  // Contains path, expected type, actual value
}
```

### Custom Error Messages

```typescript
import { Schema } from "effect"

const Email = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "Invalid email format"
  })
)

const Age = Schema.Number.pipe(
  Schema.between(0, 150, {
    message: () => "Age must be between 0 and 150"
  })
)

const Password = Schema.String.pipe(
  Schema.minLength(8, { message: () => "Password must be at least 8 characters" }),
  Schema.pattern(/[A-Z]/, { message: () => "Password must contain uppercase" }),
  Schema.pattern(/[0-9]/, { message: () => "Password must contain a number" })
)
```

## Best Practices

1. **Infer types from schemas** - Use `Schema.Schema.Type<typeof X>` instead of manual types
2. **Use brands for domain types** - Prevents mixing IDs of different entities
3. **Validate at boundaries** - Decode external data early, work with typed data internally
4. **Compose schemas** - Build complex schemas from simpler ones
5. **Add custom error messages** - Make validation errors user-friendly
6. **Use transformations** - Handle format differences between API and domain
7. **Keep schemas close to usage** - Define schemas where they're used or in a shared module
