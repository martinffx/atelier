# Debugging Techniques

## Println Debugging

Start with temporary, labeled output or the project's structured logger to establish execution
order and inspect the values relevant to the current hypothesis. Print only the fields needed,
include a unique session tag, and avoid tight loops. Move to tracing, profiling, or other heavier
instrumentation only when focused logs cannot establish the evidence.

Do not print credentials, authorization data, session identifiers, personal data, private
payloads, or environment values. Remove temporary output once the investigation is complete.

## Further Instrumentation

Instrument the smallest useful boundary. Record event order, identifiers, state transitions, and
timing rather than entire payloads. Use a unique session tag for temporary instrumentation and
remove only the instrumentation introduced for that session.

Never record credentials, authorization data, session identifiers, personal data, private
payloads, or environment values. Treat captures, traces, and dumps as sensitive artifacts.

## Bisection

Narrow the failing path by disabling coherent branches, reducing inputs, or comparing a known-good
revision with a known-bad revision. Keep the system valid while narrowing; arbitrary code removal
can change the behavior being investigated.

Before revision bisection, preserve unrelated work and record the starting revision. Reset to the
starting state after the investigation.

## Non-Deterministic Failures

Record the conditions of every attempt: input, environment, timing, concurrency, seed, and result.
Vary one condition at a time. Use delays and load only to perturb scheduling, never as proof of the
cause. Prefer deterministic scheduling, fault injection, or recorded traces when available.

## Performance Investigation

Establish a representative baseline before changing code. Use measurements, profiling, tracing, or
query plans that fit the suspected bottleneck. Avoid high-volume logging on the hot path because it
can alter timing.

Some analysis tools execute the operation they inspect. Confirm whether a command is read-only and
whether it can create load, acquire locks, or repeat side effects before using it outside an
isolated environment.

## Production Safety

Default to development, staging, or an isolated replica. Before production instrumentation,
replay, or load generation, obtain explicit authorization and define scope, rate limits, rollback,
and a stop condition. Replay only idempotent or dry-run operations unless the user explicitly
accepts the side effects.

## Cleanup

Before closing the investigation:

- Remove temporary instrumentation and throwaway harnesses.
- Preserve only sanitized evidence needed to explain the conclusion.
- Re-run the original verification signal.
- Record the confirmed cause, fix, and prevention measure.
