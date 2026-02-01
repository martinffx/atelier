# Migration Guide: Adopting Functional Patterns

This guide provides a practical, incremental approach to introducing functional patterns (ADTs, Option, Result, branded types) into an existing TypeScript codebase.

## Migration Philosophy

**Start small, prove value, expand gradually.**

Don't rewrite everything at once. Instead:
1. Apply patterns to new features immediately
2. Refactor existing code opportunistically (when touching it)
3. Prioritize high-risk areas (financial calculations, state machines)
4. Build team familiarity through examples and pairing

## Stage 1: Setup and Foundation

### Enable TypeScript Strict Mode

Add these flags to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "strictFunctionTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Why:** These flags make the type system stricter, enabling better safety and forcing you to handle edge cases.

**How to migrate:**
1. Start with `strictNullChecks: true`
2. Fix all type errors (replace `T` with `T | null | undefined` where needed)
3. Gradually enable other flags
4. Use `// @ts-expect-error` for complex migrations (remove later)

### Create Utility Files

Create a `lib/functional.ts` file with core utilities:

```typescript
// ============================================
// Option Type
// ============================================
export type None = { _tag: "None" }
export type Some<T> = { _tag: "Some"; value: T }
export type Option<T> = None | Some<T>

export const None: None = { _tag: "None" }
export const Some = <T>(value: T): Option<T> => ({ _tag: "Some", value })

export const isNone = <T>(opt: Option<T>): opt is None => opt._tag === "None"
export const isSome = <T>(opt: Option<T>): opt is Some<T> => opt._tag === "Some"

export const getOrElse = <T>(opt: Option<T>, defaultValue: T): T =>
  opt._tag === "Some" ? opt.value : defaultValue

export const map = <T, U>(opt: Option<T>, fn: (value: T) => U): Option<U> =>
  opt._tag === "Some" ? Some(fn(opt.value)) : None

export const flatMap = <T, U>(opt: Option<T>, fn: (value: T) => Option<U>): Option<U> =>
  opt._tag === "Some" ? fn(opt.value) : None

// ============================================
// Result Type
// ============================================
export type Ok<T> = { _tag: "Ok"; value: T }
export type Err<E> = { _tag: "Err"; error: E }
export type Result<T, E> = Ok<T> | Err<E>

export const Ok = <T>(value: T): Result<T, never> => ({ _tag: "Ok", value })
export const Err = <E>(error: E): Result<never, E> => ({ _tag: "Err", error })

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result._tag === "Ok"
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => result._tag === "Err"

export const mapResult = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result._tag === "Ok" ? Ok(fn(result.value)) : result

export const flatMapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  result._tag === "Ok" ? fn(result.value) : result

// ============================================
// Exhaustiveness Checking
// ============================================
export const assertNever = (x: never): never => {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`)
}

// ============================================
// Branded Types
// ============================================
export type Brand<K, T> = K & { __brand: T }
```

Import from this file across your codebase:

```typescript
import { Option, Some, None, Result, Ok, Err } from "@/lib/functional"
```

## Stage 2: Identify Code Smells

Look for these patterns that benefit from functional refactoring:

### 1. Boolean Soup

**Before:**
```typescript
type Order = {
  id: string
  isPaid: boolean
  isShipped: boolean
  isCancelled: boolean
}
// What does { isPaid: true, isCancelled: true } mean?
```

**After:**
```typescript
type OrderStatus =
  | { kind: "pending" }
  | { kind: "paid"; paidAt: Date }
  | { kind: "shipped"; trackingNumber: string }
  | { kind: "delivered"; deliveredAt: Date }
  | { kind: "cancelled"; reason: string }

type Order = {
  id: string
  status: OrderStatus
}
```

### 2. Null/Undefined Checks

**Before:**
```typescript
function findUser(id: string): User | null {
  // ...
}

const user = findUser("123")
if (user !== null) {
  console.log(user.name)
} else {
  console.log("Not found")
}
```

**After:**
```typescript
function findUser(id: string): Option<User> {
  const user = database.get(id)
  return user ? Some(user) : None
}

const user = findUser("123")
switch (user._tag) {
  case "Some":
    console.log(user.value.name)
    break
  case "None":
    console.log("Not found")
    break
}
```

### 3. Error Handling with Exceptions

**Before:**
```typescript
function parseConfig(raw: string): Config {
  try {
    return JSON.parse(raw)
  } catch (e) {
    // Caller doesn't know this throws
    throw new Error("Invalid config")
  }
}
```

**After:**
```typescript
type ParseError = { message: string; cause?: unknown }

function parseConfig(raw: string): Result<Config, ParseError> {
  try {
    const data = JSON.parse(raw)
    return Ok(data)
  } catch (e) {
    return Err({ message: "Invalid config", cause: e })
  }
}
```

### 4. Primitive Obsession

**Before:**
```typescript
function calculateTotal(priceInCents: number, taxInDollars: number): number {
  // Mix of units - error-prone!
  return priceInCents + taxInDollars * 100
}
```

**After:**
```typescript
type Cents = Brand<number, "Cents">
const Cents = (n: number): Cents => {
  if (!Number.isInteger(n) || n < 0) throw new Error("Invalid cents")
  return n as Cents
}

function calculateTotal(price: Cents, tax: Cents): Cents {
  return Cents(price + tax) // Type-safe
}
```

## Stage 3: Incremental Adoption Strategy

### Week 1-2: New Features Only

Apply patterns to all new features:
- Use discriminated unions for state machines
- Use Option for nullable values
- Use Result for operations that may fail
- Use branded types for domain IDs and units

**Goal:** Build team familiarity without touching existing code.

### Week 3-4: Bug Fixes and Refactoring

When fixing bugs, refactor to functional patterns:
- Boolean soup → Discriminated unions
- Null checks → Option
- Try/catch → Result
- Primitive types → Branded types

**Goal:** Improve code quality while fixing issues.

### Week 5-8: High-Risk Areas

Prioritize areas where bugs have high impact:
- **Financial calculations**: Use branded types for Cents, Dollars, BasisPoints
- **State machines**: Use discriminated unions for transaction states
- **Authentication**: Use branded types for tokens, session IDs
- **Configuration**: Use Result for parsing and validation

**Goal:** Reduce risk in critical paths.

### Month 3+: Gradual Expansion

Continue applying patterns when touching code. Measure impact:
- Fewer null pointer errors
- Fewer unit confusion bugs
- Fewer missing case errors (exhaustiveness)
- Easier refactoring (type safety)

## Stage 4: Pattern-Specific Migration

### Migrating to Discriminated Unions

**Step 1: Identify boolean soup**
```typescript
// Before
type User = {
  isActive: boolean
  isBanned: boolean
}
```

**Step 2: Define discriminated union**
```typescript
// After
type UserStatus =
  | { kind: "active" }
  | { kind: "banned"; reason: string; bannedAt: Date }
  | { kind: "inactive"; inactiveAt: Date }
```

**Step 3: Update type definition**
```typescript
type User = {
  id: UserId
  email: Email
  status: UserStatus // Replace booleans with status
}
```

**Step 4: Update creation code**
```typescript
// Before
const user = { id: "123", isActive: true, isBanned: false }

// After
const user = { id: UserId("123"), email: Email("user@example.com"), status: { kind: "active" } }
```

**Step 5: Update consumption code**
```typescript
// Before
if (user.isActive && !user.isBanned) {
  allowLogin(user)
}

// After
switch (user.status.kind) {
  case "active":
    allowLogin(user)
    break
  case "banned":
    showBannedMessage(user.status.reason)
    break
  case "inactive":
    showInactiveMessage()
    break
  default:
    assertNever(user.status)
}
```

### Migrating to Option

**Step 1: Identify nullable types**
```typescript
function findUser(id: string): User | null
```

**Step 2: Change return type to Option**
```typescript
function findUser(id: string): Option<User>
```

**Step 3: Update implementation**
```typescript
// Before
function findUser(id: string): User | null {
  const user = database.get(id)
  return user ?? null
}

// After
function findUser(id: string): Option<User> {
  const user = database.get(id)
  return user ? Some(user) : None
}
```

**Step 4: Update call sites**
```typescript
// Before
const user = findUser("123")
if (user !== null) {
  console.log(user.name)
}

// After
const user = findUser("123")
switch (user._tag) {
  case "Some":
    console.log(user.value.name)
    break
  case "None":
    console.log("Not found")
    break
}
```

### Migrating to Result

**Step 1: Identify throwing functions**
```typescript
function parseConfig(raw: string): Config {
  // Throws on error
}
```

**Step 2: Define error type**
```typescript
type ParseError = { message: string; field?: string }
```

**Step 3: Change return type to Result**
```typescript
function parseConfig(raw: string): Result<Config, ParseError>
```

**Step 4: Update implementation**
```typescript
// Before
function parseConfig(raw: string): Config {
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error("Invalid config")
  }
}

// After
function parseConfig(raw: string): Result<Config, ParseError> {
  try {
    const data = JSON.parse(raw)
    return Ok(data)
  } catch (e) {
    return Err({ message: "Invalid JSON" })
  }
}
```

**Step 5: Update call sites**
```typescript
// Before
try {
  const config = parseConfig(rawConfig)
  startServer(config)
} catch (e) {
  console.error("Config error:", e)
}

// After
const configResult = parseConfig(rawConfig)
switch (configResult._tag) {
  case "Ok":
    startServer(configResult.value)
    break
  case "Err":
    console.error("Config error:", configResult.error.message)
    break
}
```

### Migrating to Branded Types

**Step 1: Identify primitive obsession**
```typescript
function getUser(id: string): User
function getOrder(id: string): Order

// Problem: Can mix up IDs
const orderId = "ord_123"
getUser(orderId) // Compiles but wrong!
```

**Step 2: Define branded types**
```typescript
type UserId = Brand<string, "UserId">
type OrderId = Brand<string, "OrderId">

const UserId = (s: string): UserId => {
  if (!/^usr_/.test(s)) throw new Error("Invalid UserId")
  return s as UserId
}

const OrderId = (s: string): OrderId => {
  if (!/^ord_/.test(s)) throw new Error("Invalid OrderId")
  return s as OrderId
}
```

**Step 3: Update function signatures**
```typescript
function getUser(id: UserId): User
function getOrder(id: OrderId): Order
```

**Step 4: Update call sites**
```typescript
// Before
const userId = "usr_123"
getUser(userId)

// After
const userId = UserId("usr_123")
getUser(userId)
```

## Stage 5: CI/CD Enforcement

### Linting Rules

Create ESLint rules to enforce patterns:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Prefer switch over if-else for discriminated unions
    "no-else-return": "error",

    // Require default case in switch
    "default-case": "error",
  },
}
```

### Type Coverage

Measure type safety with `type-coverage`:

```bash
npm install -D type-coverage
npx type-coverage --at-least 95
```

### Pre-commit Hooks

Use `husky` to run type checks before commit:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "tsc --noEmit"
    }
  }
}
```

## Stage 6: Team Adoption

### Documentation

Create internal docs with examples:
- Why we use these patterns (reliability, safety)
- When to use each pattern (decision guide)
- How to migrate existing code (this guide)
- Common mistakes and solutions

### Code Reviews

Review checklist:
- [ ] New state modeled with discriminated unions (not booleans)
- [ ] Nullable values use Option (not `| null`)
- [ ] Fallible operations use Result (not throwing)
- [ ] Domain IDs use branded types (not raw strings)
- [ ] All switch statements have `assertNever` in default case
- [ ] Smart constructors validate invariants

### Pairing Sessions

Pair with team members on:
- First discriminated union implementation
- First Option/Result migration
- First branded type creation
- Code review of functional patterns

### Internal Talks

Host brown-bag sessions:
- "Why functional patterns matter" (30 min)
- "Migrating to discriminated unions" (45 min)
- "Option vs Result vs Exceptions" (30 min)
- "Branded types for domain modeling" (45 min)

## Common Migration Challenges

### Challenge 1: "Too much boilerplate"

**Problem:** Pattern matching feels verbose compared to `if (x != null)`.

**Solution:** Accept some verbosity for safety. The compiler proves correctness. Consider:
- Null checks miss cases (forgot to check before accessing)
- Switch with `assertNever` proves exhaustiveness
- Cost: 2 extra lines. Benefit: Compiler-proven correctness.

### Challenge 2: "Existing code uses null everywhere"

**Problem:** Can't migrate everything at once.

**Solution:** Create adapter functions:

```typescript
// Adapter for legacy code
function optionToNullable<T>(opt: Option<T>): T | null {
  return opt._tag === "Some" ? opt.value : null
}

function nullableToOption<T>(value: T | null): Option<T> {
  return value != null ? Some(value) : None
}

// Use at boundaries
const user = findUser("123") // Returns Option<User>
legacyFunction(optionToNullable(user)) // Legacy expects User | null
```

### Challenge 3: "Team not convinced"

**Problem:** Developers resistant to change.

**Solution:**
1. Start with new features (no risk to existing code)
2. Show concrete bug prevented by pattern (e.g., missing switch case)
3. Measure impact: fewer null errors, fewer unit mix-ups
4. Demonstrate refactoring safety (add variant, compiler shows all needed changes)
5. Share success stories from team

### Challenge 4: "Performance concerns"

**Problem:** Worried about extra object allocations.

**Solution:**
- Branded types have zero runtime cost (compile-time only)
- Option/Result overhead is negligible (one extra property)
- TypeScript optimizes discriminated unions well
- Profile before optimizing
- Correctness > micro-optimizations in most code

### Challenge 5: "JSON serialization breaks"

**Problem:** Branded types don't serialize to JSON correctly.

**Solution:** Create serialization helpers:

```typescript
type UserId = Brand<string, "UserId">

// Serialize: strip brand (it's just a string)
function userIdToJSON(id: UserId): string {
  return id
}

// Deserialize: validate and brand
function userIdFromJSON(json: string): Result<UserId, string> {
  if (!/^usr_/.test(json)) {
    return Err("Invalid UserId format")
  }
  return Ok(json as UserId)
}

// In practice
const json = JSON.stringify({ userId: userIdToJSON(userId) })
const parsed = JSON.parse(json)
const userIdResult = userIdFromJSON(parsed.userId)
```

## Measuring Success

Track these metrics before and after adoption:

### Bugs Prevented
- Null pointer errors
- Unit confusion (cents vs dollars)
- Missing switch cases
- Invalid state combinations (boolean soup)

### Code Quality
- Type coverage percentage
- Number of `any` types
- Number of `// @ts-ignore` comments

### Developer Experience
- Time to refactor features (should decrease)
- Confidence in refactoring (should increase)
- Time spent debugging type errors (should decrease)
- Time to onboard new developers (may increase initially, then decrease)

## Timeline Example

**Month 1:**
- Enable strict mode
- Create utility files
- Apply to 2-3 new features
- Team training (brown-bag)

**Month 2:**
- Apply to all new features
- Refactor 5-10 bug fixes
- Pair with team members
- Measure initial impact

**Month 3:**
- Migrate high-risk areas (financial, auth)
- Expand to 50% of active development
- Add CI checks
- Review and iterate

**Month 4+:**
- Standard practice for all code
- Continue opportunistic refactoring
- Measure long-term impact
- Share learnings

## Further Reading

- [ADTs](./adts.md) - Algebraic Data Types and discriminated unions
- [Option & Result](./option-result.md) - Type-safe error handling
- [Branded Types](./branded-types.md) - Smart constructors and nominal typing
