---
name: oracle-security
description: Security architecture and threat modeling knowledge. Auto-invokes when designing features that handle untrusted data, authentication, authorization, external integrations, file uploads, or sensitive data. Provides risk assessment frameworks, trust boundary analysis, and security design principles — not implementation code.
user-invocable: false
---

# oracle-security: Security Architecture & Threat Modeling

## When to Use

Auto-invokes when context contains:
- Authentication, authorization, session management
- User input, validation, untrusted data
- External integrations, webhooks, third-party APIs
- File uploads, data processing
- Encryption, hashing, secrets, sensitive data
- Security concerns, vulnerabilities, threats

## The Security Mindset

### Core Principles

1. **Validate at Boundaries** — Every entry point is a trust boundary. Assume everything that crosses it is hostile until proven otherwise.

2. **Never Trust the Client** — Client-side validation, hidden fields, and browser headers are UX conveniences, not security controls. The server is the only security boundary that matters.

3. **Fail Closed** — Deny by default. When in doubt, reject. When validation fails, stop. When auth is uncertain, deny. "Fail open" is an accidental backdoor.

4. **Defense in Depth** — No single control should be the only thing preventing compromise. Layer them so that bypassing one still leaves others.

5. **Least Privilege** — Every component should have the minimum access necessary to do its job, and only for the minimum time required.

6. **Compartmentalize** — A breach in one area should not automatically grant access to everything else. Isolate by function, data sensitivity, and trust level.

### The Trust Boundary Model

```
External World  →  [Trust Boundary]  →  Internal System
       ↑                                    ↑
   Validate here                        Enforce here
   Sanitize here                         Audit here
   Authenticate here                     Authorize here
```

Trust boundaries exist at every system edge where data or control crosses from a less-trusted to a more-trusted zone:

- **API routes / controllers** — Where external requests enter
- **Event consumers** — Where external events are processed
- **File processors** — Where external files are handled
- **External service callbacks** — Where third-party responses enter
- **Database writes** — When data from external sources persists

**Key insight**: Security enforcement should happen as close to the trust boundary as possible. Don't let untrusted data travel deep into your system before validation.

## Threat Modeling Quick-Start

### Simplified STRIDE

For every feature, ask these six questions:

| Threat | Question | Example Concern |
|--------|----------|----------------|
| **S**poofing | Who could pretend to be someone else? | Fake user IDs, stolen tokens, forged requests |
| **T**ampering | What could be modified in transit or at rest? | Request payload alteration, data corruption |
| **R**epudiation | Can actions be denied after the fact? | Missing audit logs, unaccountable changes |
| **I**nformation Disclosure | What sensitive data could leak? | Error messages, logs, API responses |
| **D**enial of Service | How could this be overwhelmed or broken? | No rate limits, expensive queries, resource exhaustion |
| **E**levation of Privilege | Who could gain more access than intended? | Missing authorization checks, parameter tampering |

### Attack Tree Thinking

For critical features, build a simple attack tree:

1. **Goal**: What does the attacker want? (data, access, disruption)
2. **Paths**: How could they achieve it? (multiple entry points, chained vulnerabilities)
3. **Barriers**: What stops each path? (validation, auth, rate limits, encryption)
4. **Gaps**: Where are there no barriers? (missing checks, implicit trust)

**Usage**: You don't need a formal diagram. A bullet list of "to steal X, attacker could Y which is blocked by Z, unless they find W" is sufficient for most design reviews.

## Risk Proportionality

### Assessment Dimensions

Consider two factors:

- **Impact**: What happens if this is exploited? (reputational damage, financial loss, legal consequences, user harm)
- **Likelihood**: How easy is exploitation? (public internet access, authenticated only, internal network, physical access required)

### Flexible Guidance

| Context | Typical Posture |
|---------|-----------------|
| Public-facing, unauthenticated | Maximum validation, rate limiting, minimal data exposure, aggressive fail-closed |
| Authenticated user operations | Standard validation, authorization checks, audit logging, session management |
| Internal admin tools | Authentication essential, authorization by role, audit everything, additional monitoring |
| Background processing | Input validation still required, fail-safe defaults, logging for debugging |

**Adjust based on your threat model.** A public search box and an internal admin panel have different risks. Don't apply maximum security everywhere — apply *proportional* security everywhere.

## Security Architecture Patterns

### Defense in Depth

Don't rely on a single control. Layer them:

```
Input → [Validation] → [Authentication] → [Authorization] → [Audit]
         ↑              ↑                 ↑                ↑
      Reject bad     Verify who         Check can-do       Log did-do
      data           they are           they have          they did
```

If any layer fails, the others still provide protection. A validation bypass shouldn't automatically mean unauthorized access.

### Least Privilege

- Services should have minimum database permissions (read-only where possible, never admin by default)
- API tokens should have scoped access (not blanket permissions)
- User sessions should timeout (not indefinite, not excessively long)
- Background jobs should run with restricted credentials (not application-level access)

**Corollary**: When a component needs elevated access temporarily, that access should be explicitly granted and automatically revoked.

### Fail-Safe Defaults

- Permission denied unless explicitly granted (not granted unless explicitly denied)
- Reject input that doesn't match expected format (don't try to fix or coerce)
- Lock account after repeated failures (don't allow infinite attempts)
- Default to most restrictive CORS, CSP, and network policies (open up explicitly)

**Key question**: "If this component fails or is misconfigured, what's the safest default state?"

### Compartmentalization

- Separate sensitive data from operational data (different stores, different access levels)
- Use different credentials for different services (one breach doesn't cascade)
- Isolate file processing from application logic (sandbox, validate before processing)
- Don't mix admin and user operations in the same endpoints or components

## Design Review Questions

Ask before implementing:

### Data Handling
- [ ] What data enters the system? Where does it come from? How is it validated?
- [ ] What data exits the system? Who can see it? Is it filtered appropriately?
- [ ] What happens to data at rest? Is sensitive data protected?
- [ ] Are there retention/deletion requirements? How are they enforced?

### Access Control
- [ ] Who can access this feature? How is that authenticated and enforced?
- [ ] Can users access other users' data? How is that prevented?
- [ ] Are there different permission levels? How are they checked?
- [ ] What happens when permissions change (revocation, role change)?

### Threat Surface
- [ ] What new entry points does this feature create?
- [ ] What existing trust boundaries does this cross?
- [ ] What external systems does this depend on? What's their security posture?
- [ ] What happens if those systems are compromised or unavailable?

### Failure Modes
- [ ] What happens when validation fails? (Should fail closed)
- [ ] What happens when authentication fails? (Should not reveal user existence)
- [ ] What happens when dependencies fail? (Should degrade safely)
- [ ] Are errors informative for debugging without being revealing for attackers?

## Red Flags & Anti-Patterns

### Architectural Smells

- **Trusting external input without validation** — Browser headers, webhook payloads, file contents, third-party API responses. All are untrusted until validated.

- **Single authorization check at entry** — Checking auth at the route level but not verifying resource ownership on each operation. Every action on a resource needs its own authorization check.

- **Errors revealing system internals** — Stack traces, database schemas, file paths, internal IDs in error messages. Debug information belongs in logs, not responses.

- **No audit trail for sensitive operations** — If you can't reconstruct who did what after an incident, you can't investigate or recover.

- **Broad permissions by default** — Service accounts with admin access, tokens with blanket permissions, users with more roles than they need.

- **Security logic in client code** — "The frontend will validate" or "the mobile app won't send that." The client is not a security boundary.

### Process Smells

- "We'll add security later" — Security retrofitting is 10x harder and 10x more expensive than designing it in.
- "This is just internal" — Internal tools are prime targets. Attackers specifically look for weak internal systems.
- "No one would try to exploit this" — Automated attacks are indiscriminate. You don't need to be a target to be compromised.
- "The framework handles security" — Frameworks provide primitives and tools. You must compose them correctly.
- "Security slows development" — Insecure code slows you more when you have to stop everything to respond to a breach.

## Common Rationalizations

| Rationalization | Reality |
|-----------------|---------|
| "It's just a prototype" | Prototypes become production. Security habits from day one prevent day-one-hundred emergencies. |
| "This is an internal tool" | Internal tools are targets. Attackers look for the weakest link, and internal systems are often it. |
| "We'll add security later" | Later rarely comes. Retrofitting is expensive, error-prone, and usually incomplete. |
| "The framework handles security" | Frameworks provide primitives. You compose them correctly. They don't secure your application by default. |
| "No one would target us" | Automated attacks are indiscriminate. Scanners don't care who you are. |
| "Security slows development" | Insecure code costs more: incident response, legal exposure, user trust loss. |

## Verification

After designing security-relevant features:

- [ ] Threat model documented (even if brief — STRIDE questions answered)
- [ ] Trust boundaries identified and validation points specified
- [ ] Input validation strategy defined (where, what, how strict)
- [ ] Authentication requirements specified (who, how, session management)
- [ ] Authorization rules documented (who can do what to what)
- [ ] Failure modes specified (fail closed, not open)
- [ ] Audit requirements identified (what to log, where)
- [ ] External dependencies' security posture considered
- [ ] No secrets or sensitive data in design documents (future attack surface)

## See Also

- `references/threat-modeling-guide.md` — Extended threat modeling approaches
- `references/security-patterns.md` — Catalog of security design patterns

---

*Security is not a feature you add. It's a property of the system you design.*
