# Principles

Each principle: the rule, why it matters in glossary terms (see [SKILL.md](../SKILL.md)), and a short example. Examples are TypeScript.

## 1. Deep modules and the deletion test

**Rule.** Put a lot of behaviour behind a small interface. Imagine deleting the module: if complexity vanishes, it was a pass-through; if it reappears across N callers, it was earning its keep.

**Why.** Depth gives callers leverage and maintainers locality.

```typescript
// Shallow: the interface is the implementation
class UserRepo {
  getTable() { return this.db.table("users"); }
  runQuery(q: Query) { return this.db.run(q); }
}

// Deep: callers say what they want
class UserRepo {
  findByEmail(email: Email): Promise<User | undefined> { /* query, mapping, caching */ }
}
```

## 2. Test at the correct level

**Rule.** The interface is the test surface. Test through the module's interface at its seam, not each internal function. When you deepen a module, replace the old tests; don't layer new ones on top.

**Why.** Tests that reach past the interface break on every refactor and prove nothing the interface doesn't. If you want to test past the interface, the module is probably the wrong shape.

- Unit-test the functional core directly; it has no I/O.
- Integration-test the shell with a local stand-in (see [deepening.md](deepening.md)).
- Don't mock your own modules. Mock only true external dependencies at a port.
- Assert on observable outcomes, not internal state.

**Smell.** A test that changes whenever the implementation changes; many tiny tests of pure helpers while the real bugs hide in how they're called.

## 3. Parse, don't validate

**Rule.** At the external seam, turn untrusted input into a domain type that can only exist if valid. The core accepts the parsed type and never re-checks.

**Why.** Validation returns a boolean and discards what it learned, so every downstream caller must re-validate or hope. Parsing keeps the knowledge in the type. Locality: the check lives in one place.

```typescript
// Validate: knowledge is lost, callers re-check
function isEmail(s: string): boolean { /* ... */ }
function sendWelcome(to: string) { if (!isEmail(to)) throw new Error("bad email"); /* ... */ }

// Parse: knowledge is kept in the type
type Email = string & { readonly __brand: "Email" };
function parseEmail(s: string): Result<Email, InvalidEmail> { /* ... */ }
function sendWelcome(to: Email) { /* no check needed */ }
```

In a layered codebase this is `Entity.fromRequest`: the router hands raw input to the Entity, which parses it into domain values, and everything below works with parsed types.

**Smell.** The same field checked in router, service, and repository; `string` parameters that must be "a valid X".

## 4. Make illegal states unrepresentable

**Rule.** Shape the types so invalid combinations cannot be constructed. Prefer discriminated unions to a bag of flags and optionals.

**Why.** Every representable-but-invalid state is a case every caller must handle, which is interface complexity. Removing it shrinks the interface.

```typescript
// Illegal states possible: loading with an error, data with no result
type Fetch = { loading: boolean; error?: Error; data?: Data };

// Only legal states exist
type Fetch =
  | { status: "loading" }
  | { status: "failed"; error: Error }
  | { status: "loaded"; data: Data };
```

**Smell.** Comments like "only set when `kind` is X"; several booleans that can't all be true; optional fields that are required in some states.

## 5. Functional core, imperative shell

**Rule.** Keep decisions in pure functions that take values and return values. Push I/O (database, network, clock, randomness) to a thin shell that gathers inputs, calls the core, and applies the result.

**Why.** The core is testable without mocks and holds the logic, so bugs concentrate there (locality). The shell is simple enough to cover with a few integration tests.

```typescript
// Core: pure decision
function decideRenewal(sub: Subscription, now: Date): RenewalDecision { /* ... */ }

// Shell: I/O around it
async function renew(id: SubscriptionId) {
  const sub = await repo.get(id);
  const decision = decideRenewal(sub, clock.now());
  await apply(decision);
}
```

**Smell.** Business rules interleaved with queries; tests that need a mocked database to check a calculation. Counter-smell: a pure helper extracted only for testability while the real bugs sit in how it's called. Keep decisions and their orchestration close.

## 6. Errors as values

**Rule.** Expected failures (invalid input, not found, conflict) are part of the interface and are returned as typed values, such as `Result<T, E>`. Exceptions are for bugs and unrecoverable states.

**Why.** Error modes are part of the interface. If they're hidden in `throw`, the caller can't see what to handle and the compiler can't help.

```typescript
function placeOrder(cmd: PlaceOrder): Result<Order, OutOfStock | PaymentDeclined> { /* ... */ }
```

But first, try principle 7: if the error can be defined away, it should not be in the interface at all.

**Smell.** `catch` blocks that parse error messages; functions documented with "may throw X, Y, Z".

## 7. Define errors out of existence

**Rule.** Change the semantics so the error condition is not an error. Do this before reaching for `Result`.

**Why.** Every error is interface surface callers must handle. The best error handling is none.

- `delete(key)` on a missing key succeeds; the postcondition (key absent) holds.
- `substring(start, end)` clamps out-of-range indices instead of throwing.
- Return an empty collection, not `null`.

**Caution.** Don't swallow errors that matter. Define away only when the caller's intent is satisfied either way.

## 8. Information hiding

**Rule.** Each design decision (a file format, a protocol, an algorithm, a table layout) lives in exactly one module.

**Why.** Knowledge that appears in two modules is a leak: change one and you must change both (change amplification). Locality means a decision changes in one place.

**Smell.** Two modules that both know the wire format; callers that must call methods in a particular order (temporal decomposition: structure follows the order of operations rather than the knowledge involved).

## 9. Pull complexity downward

**Rule.** When complexity must live somewhere, put it in the module, not its callers. A simple interface matters more than a simple implementation.

**Why.** There are many callers and one module. Complexity pushed up is paid N times.

**Smell.** Config parameters that make callers decide what the module could decide; exceptions the caller can only rethrow.

## 10. Somewhat general-purpose modules are deeper

**Rule.** Design the interface for the underlying capability, not for today's single use. Keep it general enough to cover related uses, but implement only what's needed now. Keep general-purpose code apart from special-purpose code.

**Why.** A general interface is usually smaller and simpler than a stack of special cases, and it survives the next feature.

**Smell.** Methods named for one screen or one caller (`deleteSelectedTextFromEditor`); a general mechanism with feature-specific branches inside it.

## 11. Different layers, different abstractions

**Rule.** Each layer should offer an abstraction distinct from the ones above and below. A method that only forwards to another method with the same signature is a pass-through; so is a variable threaded unchanged through a chain of calls.

**Why.** A pass-through adds interface without depth. The deletion test flags it.

If a layer exists because the project's architecture demands it (Router → Service → Repository), make it earn its place: give it behaviour the layer below doesn't have, or fold the behaviour down. For a pass-through variable, put it in a context object or shared module.

## 12. Together or apart

**Rule.** Combine modules that share information, are always used together, or overlap conceptually. Separate general mechanism from specific use. Don't split just to make things short.

**Why.** Splitting adds interface and separates things that need each other. Combining adds locality. Judge by interface complexity and dependencies, not by line count.

**Smell.** Conjoined methods: you can't understand one without reading the other.

## 13. Make the common case simple

**Rule.** Give parameters sensible defaults and design the default path to need no configuration. Rare needs may cost more.

**Why.** Interface complexity is paid by every caller; the common caller shouldn't pay for the rare one.

```typescript
// Common case: one argument
createClient(url);
// Rare case: opt in
createClient(url, { retries: 5, timeoutMs: 2_000 });
```

## 14. Comments and names carry the design

**Rule.**
- Comments describe what isn't obvious from the code. Interface comments state the abstraction (what it does, invariants, error modes); implementation comments explain *why*.
- Write the interface comment first. If it is hard to write, the design is unclear: fix the design.
- Names are precise and used consistently for the same thing.
- Design for ease of reading, not ease of writing.

**Why.** A comment that repeats the code adds nothing; a comment that states the abstraction is the interface's documentation. Names are the cheapest interface.

**Link.** A name you can't pick, or a concept you can't describe simply, usually means the domain language isn't settled. Resolve it with `oracle-domain-modelling` and record it in `CONTEXT.md`. If the decision is contested, run it through `oracle-grill-me`.

## 15. Seam discipline

**Rule.**
- Accept dependencies; don't create them.
- Return results; don't produce side effects.
- One adapter means a hypothetical seam. Two means a real one. Don't introduce a port unless something actually varies across it.

**Why.** Seams cost interface. Pay only where behaviour varies (typically production and test).

```typescript
// Testable
function processOrder(order: Order, paymentGateway: PaymentGateway) {}

// Hard to test
function processOrder(order: Order) {
  const gateway = new StripeGateway();
}
```
