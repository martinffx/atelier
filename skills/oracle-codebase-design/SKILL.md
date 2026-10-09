---
name: oracle-codebase-design
description: >
  Shared vocabulary and principles for designing deep modules. Use when designing or changing
  a module's interface, deciding where a seam goes, handling untrusted input at the edges,
  choosing the level to test at, naming modules, or making code more testable. Also use when
  another skill needs the deep-module vocabulary.
user-invocable: false
---

# Codebase Design

Design **deep modules**: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface. The aim is leverage for callers, locality for maintainers, and testability for everyone.

## Why

Complexity is the enemy. It shows up as:

- **Change amplification**: a simple change touches many places.
- **Cognitive load**: you must hold a lot in your head to change anything safely.
- **Unknown unknowns**: it is not obvious what you need to change or know.

It has two causes: **dependencies** and **obscurity**. Good design removes both.

Work **strategically, not tactically**. Working code is not enough. Each change is a small, continual investment in the design, not a patch on top of it.

## Glossary

Use these terms exactly. Don't substitute "component," "service," "API," or "boundary." Consistent language is the whole point.

**Module**: anything with an interface and an implementation. Deliberately scale-agnostic: a function, class, package, or tier-spanning slice. _Avoid_: unit, component, service.

**Interface**: everything a caller must know to use the module correctly: the type signature, but also invariants, ordering constraints, error modes, required configuration, and performance characteristics. _Avoid_: API, signature (too narrow, they refer only to the type-level surface).

**Implementation**: what's inside a module, its body of code. Distinct from **Adapter**: a thing can be a small adapter with a large implementation (a Postgres repo) or a large adapter with a small implementation (an in-memory fake). Reach for "adapter" when the seam is the topic; "implementation" otherwise.

**Depth**: leverage at the interface. The amount of behaviour a caller (or test) can exercise per unit of interface they have to learn. A module is **deep** when a large amount of behaviour sits behind a small interface, **shallow** when the interface is nearly as complex as the implementation.

**Seam** _(Michael Feathers)_: a place where you can alter behaviour without editing in that place; the *location* at which a module's interface lives. Where to put the seam is its own design decision, distinct from what goes behind it. _Avoid_: boundary (overloaded with DDD's bounded context).

**Adapter**: a concrete thing that satisfies an interface at a seam. Describes *role* (what slot it fills), not substance (what's inside).

**Leverage**: what callers get from depth. More capability per unit of interface they learn. One implementation pays back across N call sites and M tests.

**Locality**: what maintainers get from depth. Change, bugs, knowledge, and verification concentrate in one place rather than spreading across callers. Fix once, fixed everywhere.

### Project names

When the project's own pattern names a layer (Router, Service, Repository, Entity), keep that name for the concrete thing: say "the `OrderService`". Describe its *design* with the glossary: is that module deep, where is its seam, what is its interface?

## Deep vs shallow

**Deep module** = small interface + lots of implementation:

```
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid):

```
┌─────────────────────────────────┐
│       Large Interface           │  ← Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← Just passes through
└─────────────────────────────────┘
```

When designing an interface, ask:

- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?
- Can I define an error out of existence?

## Principles

Details, rationale, and examples in [principles.md](references/principles.md).

- **Deep modules and the deletion test.** If deleting the module makes complexity vanish, it was a pass-through.
- **Test at the correct level.** The interface is the test surface. Test at seams, not every function; replace tests, don't layer them.
- **Parse, don't validate.** Turn untrusted input into domain types at the external seam. The core never re-checks.
- **Make illegal states unrepresentable.** Shape the types so invalid combinations can't be built.
- **Functional core, imperative shell.** Pure decisions inside, I/O at the edges.
- **Errors as values.** Expected failures are part of the interface and are returned, not thrown.
- **Define errors out of existence.** Change the semantics so the error cannot occur. Do this first.
- **Information hiding.** Each design decision lives in one module. Duplicated knowledge is leakage.
- **Pull complexity downward.** A simple interface matters more than a simple implementation.
- **Somewhat general-purpose modules are deeper.** Keep general and special-purpose code apart.
- **Different layers, different abstractions.** No pass-through methods or variables.
- **Together or apart.** Combine what shares information; split general mechanism from specific use.
- **Make the common case simple.** Defaults over configuration.
- **Comments and names carry the design.** Describe what isn't obvious; write interface comments first.
- **Seam discipline.** One adapter means a hypothetical seam, two means a real one. Accept dependencies, don't create them.

## Red flags

Before finalising a design, check it against [red-flags.md](references/red-flags.md): shallow module, information leakage, pass-through method, vague name, and the rest.

## Names and domain language

Name modules with the project's domain terms from `CONTEXT.md`. A name that is hard to pick or hard to describe is a design smell: the concept is probably unclear. Resolve it with the `oracle-domain-modelling` skill, and take contested design decisions through `oracle-grill-me`.

## Relationships

- A **Module** has exactly one **Interface** (the surface it presents to callers and tests).
- **Depth** is a property of a **Module**, measured against its **Interface**.
- A **Seam** is where a **Module**'s **Interface** lives.
- An **Adapter** sits at a **Seam** and satisfies the **Interface**.
- **Depth** produces **Leverage** for callers and **Locality** for maintainers.

## Rejected framings

- **Depth as ratio of implementation-lines to interface-lines** (Ousterhout): rewards padding the implementation. We use depth-as-leverage instead.
- **"Interface" as the TypeScript `interface` keyword or a class's public methods**: too narrow: interface here includes every fact a caller must know.
- **"Boundary"**: overloaded with DDD's bounded context. Say **seam** or **interface**.

## Going deeper

- **Principles with examples**, see [principles.md](references/principles.md).
- **Red-flags checklist**, see [red-flags.md](references/red-flags.md).
- **Deepening a cluster given its dependencies**, see [deepening.md](references/deepening.md): dependency categories, seam discipline, and replace-don't-layer testing.
- **Exploring alternative interfaces**, see [design-it-twice.md](references/design-it-twice.md): spin up parallel sub-agents to design the interface several radically different ways, then compare.
