---
name: oracle-doubt
description: >
  Adversarial review of non-trivial decisions using fresh-context scrutiny.
  Use when correctness matters more than speed, when stakes are high
  (production, security-sensitive logic, irreversible operations), or before
  committing significant architectural or implementation choices.
user-invocable: true
---

# Doubt: Fresh-Context Adversarial Review

A confident answer is not a correct one. Long sessions accumulate context that quietly turns assumptions into "facts" without anyone noticing. Doubt-driven development is the discipline of materializing a fresh-context reviewer — biased to **disprove**, not approve — before any non-trivial output stands.

This is not `/review`. `/review` is a verdict on a finished artifact. This is an in-flight posture: non-trivial decisions get cross-examined while course-correction is still cheap.

## When to Use

A decision is **non-trivial** when at least one of these is true:

- It introduces or modifies branching logic
- It crosses a module or service boundary
- It asserts a property the type system or compiler cannot verify (thread safety, idempotence, ordering, invariants)
- Its correctness depends on context the future reader cannot see
- Its blast radius is irreversible (production deploy, data migration, public API change)

Apply the skill when:

- About to make an architectural decision under uncertainty
- About to commit non-trivial code
- About to claim a non-obvious fact ("this is safe", "this scales", "this matches the spec")
- Working in code you don't fully understand

**When NOT to use:**

- Mechanical operations (renaming, formatting, file moves)
- Following a clear, unambiguous user instruction
- Reading or summarizing existing code
- One-line changes with obvious correctness
- Pure tooling operations (running tests, listing files)
- The user has explicitly asked for speed over verification

If you doubt every keystroke, you ship nothing. The skill applies only to non-trivial decisions as defined above.

## Loading Constraints

This skill is designed for the **main-session orchestrator**, where Step 3 (DOUBT) can spawn fresh-context reviewers via the `task` tool.

- **Do NOT add this skill to a persona's `skills:` frontmatter.** A persona that follows Step 3 would spawn another persona — the orchestration anti-pattern explicitly forbidden by `references/orchestration-patterns.md` ("personas do not invoke other personas").
- **If you find yourself applying this skill from inside a subagent context** (where nested subagent spawn is prevented): the preferred path is to surface to the user that doubt-driven cannot run nested and let the main session handle it. As a last resort only, a degraded self-questioning fallback exists — rewrite ARTIFACT + CONTRACT as a fresh self-prompt with a hard mental separator from your prior reasoning, and walk Steps 1–5. This is **not fresh-context review** (you carry your own context with you), so flag the result as degraded and prefer escalation whenever the user is reachable.

## The Process

Copy this checklist when applying the skill:

```
Doubt cycle:
- [ ] Step 1: CLAIM — wrote the claim + why-it-matters
- [ ] Step 2: EXTRACT — isolated artifact + contract, stripped reasoning
- [ ] Step 3: DOUBT — invoked fresh-context reviewer with adversarial prompt
- [ ] Step 4: RECONCILE — classified every finding against the artifact text
- [ ] Step 5: STOP — met stop condition (trivial findings, 3 cycles, or user override)
```

### Step 1: CLAIM — Surface what stands

Name the decision in two or three lines:

```
CLAIM: "The new caching layer is thread-safe under the
        read-heavy workload described in the spec."
WHY THIS MATTERS: a race here corrupts user data and is
                  hard to detect in QA.
```

If you can't write the claim that compactly, you have a vibe, not a decision. Surface it before scrutinizing it.

### Step 2: EXTRACT — Smallest reviewable unit

A fresh-context reviewer needs the **artifact** and the **contract**, not the journey.

- **Code**: the diff or the function — not the whole file
- **Decision**: the proposal in 3–5 sentences plus the constraints it has to satisfy
- **Assertion**: the claim plus the evidence that supposedly supports it (kept distinct from the Step 1 CLAIM block, which is the orchestrator's hypothesis under scrutiny)

Strip your reasoning. If you hand over conclusions, you'll get back validation of your conclusions. The unit must be small enough that a reviewer can hold it in mind in one read — if it's a 500-line PR, decompose first.

### Step 3: DOUBT — Invoke the fresh-context reviewer

The reviewer's prompt **must be adversarial**. Framing decides the answer.

Use the adversarial prompt template from [references/adversarial-prompt.md](references/adversarial-prompt.md). The template is pasted verbatim into the subagent invocation to override any persona's default balanced response shape.

**Pass ARTIFACT + CONTRACT only. Do NOT pass the CLAIM.** Handing the reviewer your conclusion biases it toward agreement. The reviewer must independently determine whether the artifact satisfies the contract.

#### Cross-model escalation

A single-model reviewer shares blind spots with the original author — a colder, different-architecture perspective catches them. Doubt-driven is already opt-in for non-trivial decisions, so within that scope offering cross-model is part of the skill's value, not optional friction.

**Interactive sessions: always offer. Never silently skip.**

**Step 1: Ask the user**

After the single-model review in Step 3 above, but before RECONCILE, pause and ask:

> *"Single-model review complete. Want a cross-model second opinion? Options: spawn parallel subagents with different types (oracle + architect), manual external review (you paste it elsewhere), or skip."*

This question is mandatory in every interactive doubt cycle — even on artifacts that feel low-stakes. The user — not the agent — decides whether the cost is worth it. The agent's job is to surface the choice.

**Step 2: If the user picks parallel subagents — dispatch**

Spawn two `task` subagents in parallel with the same adversarial prompt + ARTIFACT + CONTRACT:

```
task tool:
  subagent_type: oracle
task tool:
  subagent_type: architect
```

Each subagent starts with isolated context by design. Take both outputs into Step 4 (RECONCILE).

**Step 3: If the user skips**

Acknowledge the skip in the output (*"Proceeding with single-model findings only"*) and continue to RECONCILE. Skipping is fine; silent skipping is not.

**Non-interactive contexts** (CI, scheduled runs):

- Cross-model is **skipped**, and the skip must be **announced** in the output: *"Cross-model skipped: non-interactive context."*
- **Never invoke external subagents without explicit user authorization** — this is a load-bearing safety property.

Cross-model adds cost, latency, and tool fragility. The agent surfaces the choice every cycle; the user decides whether this artifact warrants it.

### Step 4: RECONCILE — Fold findings back

The reviewer's output is data, not verdict. **You are still the orchestrator.** Re-read the artifact text against each finding before classifying — rubber-stamping the reviewer is the same failure mode as ignoring it.

For each finding, classify in this **precedence order** (first matching class wins):

1. **Contract misread** — reviewer flagged something specifically because the CONTRACT you provided was unclear or incomplete. Fix the contract first, re-classify on the next cycle.
2. **Valid + actionable** — real issue requiring a change to the artifact. Change it, re-loop.
3. **Valid trade-off** — issue is real but cost of fixing exceeds cost of accepting. Document the trade-off explicitly so the user sees it.
4. **Noise** — reviewer flagged something that's actually correct under context the reviewer didn't have. Note it, move on, and ask: would adding that context to the contract have prevented the false flag?

A fresh reviewer can be wrong because it lacks context. Don't defer just because it's "fresh."

### Step 5: STOP — Bounded loop, not recursion

Stop when:

- Next iteration returns only trivial or already-considered findings, **or**
- 3 cycles completed (escalate to user, don't grind a fourth alone), **or**
- User explicitly says "ship it"

If after 3 cycles the reviewer still surfaces substantive issues, the artifact may not be ready. Surface this to the user — three unresolved cycles is information about the artifact, not a reason to keep looping.

If 3 cycles is "obviously insufficient" because the artifact is large: the artifact is too big — return to Step 2 and decompose. Do not lift the bound.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'm confident, skip the doubt step" | Confidence correlates poorly with correctness on novel problems. Moments of certainty are exactly when blind spots hide. |
| "Spawning a reviewer is expensive" | Debugging a wrong commit in production is more expensive. The check is bounded; the bug isn't. |
| "The reviewer will just nitpick" | Only if unscoped. Constrain the prompt to "issues that would make this fail under the contract." |
| "I'll do doubt at the end with `/review`" | `/review` is a final gate. Doubt-driven catches wrong directions early when course-correction is cheap. By PR time it's too late. |
| "If I doubt every step I'll never ship" | The skill applies to non-trivial decisions, not every keystroke. Re-read "When NOT to Use." |
| "Two opinions are always better than one" | Not when the second has less context and produces noise. Reconcile, don't defer. |
| "The reviewer disagreed so I was wrong" | The reviewer lacks your context — disagreement is information, not verdict. Re-read the artifact, classify, then decide. |
| "Cross-model is always better" | Cross-model catches blind spots a single model shares with itself, but it adds cost and tool fragility. Offer it every interactive doubt cycle — the user decides whether the artifact warrants it. The agent's job is to surface the choice, not to gate it. |
| "User said yes once, so I can keep invoking subagents" | Each invocation is its own authorization. The artifact, the prompt, and the context change between calls — re-confirm with the user before every run. |

## Red Flags

- Spawning a fresh-context reviewer for a one-line rename or formatting change
- Treating reviewer output as authoritative without re-reading the artifact text
- Looping >3 cycles without escalating to the user
- Prompting the reviewer with "is this good?" instead of "find issues"
- Skipping doubt under time pressure on a high-stakes decision
- Re-spawning fresh-context on an unchanged artifact (you'll get the same findings; you're stalling)
- **Doubt theater (checkable signal)**: across 2 or more cycles where the reviewer surfaced substantive findings, zero findings were classified as actionable. You are validating, not doubting. Stop and escalate.
- Doubting only after committing — that's `/review`, not doubt-driven development
- Hardcoding a subagent invocation without confirming with the user that the approach is acceptable
- **Silently skipping cross-model in an interactive doubt cycle.** Even when not recommending it, the offer must be visible. Skipping is fine; silent skipping is not.
- Falling back silently when a subagent errors or is unavailable — surface the failure and let the user redirect
- Stripping the contract from the reviewer's input
- Passing the CLAIM to the reviewer (biases toward agreement)

## Interaction with Other Skills

- **`code-review` / `/review`**: complementary. `/review` is post-hoc PR verdict; doubt-driven is in-flight per-decision. Use both.
- **`oracle-architect`** / **`spec-research`**: SDD verifies *facts about frameworks* against official docs. Doubt-driven verifies *your reasoning about the artifact*. SDD checks the API exists; doubt-driven checks you used it correctly under the contract.
- **`oracle-testing`**: TDD's RED step is doubt made concrete — a failing test is a disproof attempt. When TDD applies, that failing test *is* the doubt step for behavioral claims.
- **`code-debug`**: when the reviewer surfaces a real failure mode, drop into the debugging skill to localize and fix.

## Verification

After applying doubt-driven development:

- Every non-trivial decision (per the definition above) was named explicitly as a CLAIM before standing
- At least one fresh-context review per non-trivial artifact (a failing test produced by TDD's RED step satisfies this for behavioral claims, per Interaction with Other Skills)
- The reviewer received ARTIFACT + CONTRACT — NOT the CLAIM, NOT your reasoning
- The reviewer's prompt was adversarial ("find issues"), not validating ("is it good")
- Findings were classified against the artifact text (not rubber-stamped) using the precedence: contract misread / actionable / trade-off / noise
- A stop condition was met (trivial findings, 3 cycles, or user override)
- In interactive mode, cross-model was **explicitly offered** to the user (regardless of artifact stakes) and the response was acknowledged in the output
- In non-interactive mode, cross-model was skipped and the skip was announced
- Any subagent invocation was preceded by user authorization and confirmation of the approach

## Usage Examples

**Doubt an architectural decision:**
```
/atelier-doubt
CLAIM: "I will use DynamoDB single-table design for the Order service."
WHY: "Single-table simplifies access patterns but may couple unrelated domains."
ARTIFACT: "Proposed key schema: PK=ORDER#<id>, SK=METADATA#<id>. All order data in one table."
CONTRACT: "Must support: 1) lookup by order ID, 2) list by customer, 3) list by status. No cross-domain queries."
```

**Doubt a code change before commit:**
```
/atelier-doubt
CLAIM: "The retry logic in PaymentService is safe under concurrent requests."
WHY: "Race here could double-charge customers."
ARTIFACT: "<paste diff or function>"
CONTRACT: "Must be idempotent: same paymentId processed twice produces same result, no duplicate charges."
```

**Doubt a non-obvious assertion:**
```
/atelier-doubt
CLAIM: "This migration is safe to run online without downtime."
WHY: "Downtime here blocks checkout for all users."
ARTIFACT: "ALTER TABLE orders ADD COLUMN tracking_id VARCHAR(255); CREATE INDEX idx_tracking ON orders(tracking_id);"
CONTRACT: "Must not lock table for more than 1 second. Must not fail on 10M row table. Must be backward-compatible with running application code."
```

## Relationship to Other Skills

| Skill | Use When |
|---|---|
| **oracle-doubt** | In-flight adversarial review before a decision stands. Catches wrong directions early. |
| **oracle-challenge** | Critically evaluating an existing approach or decision after it's been made. |
| **code-review** | Post-hoc PR verdict on a finished artifact. |
| **oracle-testing** | TDD RED step serves as the doubt mechanism for behavioral claims. |
| **oracle-thinkdeep** | Deep exploration and alternative discovery for complex decisions (use doubt after thinkdeep narrows to a specific choice). |

**Key distinction:**
- `oracle-doubt` = "Before I commit to this, prove me wrong" (pre-commit adversarial review)
- `oracle-challenge` = "Is this approach valid?" (critical evaluation of standing decisions)
- `code-review` = "Judge this finished artifact" (post-hoc verdict)
