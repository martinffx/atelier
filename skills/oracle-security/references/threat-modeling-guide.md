# Threat Modeling Guide

Extended approaches for analyzing security threats during system design.

## Data Flow Analysis

Map how data moves through your system to identify trust boundaries:

```
External Request → [Trust Boundary] → API Gateway → [Trust Boundary] → Service → [Trust Boundary] → Database
                        ↑                                              ↑
                   Authenticate                                    Authorize
                   Validate input                                 Validate output
                   Rate limit                                     Audit log
```

**Process**:
1. Draw the data flow for a specific use case
2. Identify every trust boundary crossing
3. Ask: "What's the worst thing that could enter here?"
4. Ask: "What validation or enforcement should happen at this boundary?"
5. Look for paths that bypass expected controls

## STRIDE in Depth

### Spoofing
- **Threat**: Attacker pretends to be a legitimate user or system
- **Questions**: How are identities verified? Can tokens be stolen or forged? Can sessions be hijacked?
- **Controls**: Strong authentication, token binding, session validation, mutual TLS

### Tampering
- **Threat**: Data is modified in transit or at rest
- **Questions**: Is integrity checked? Can parameters be altered? Can files be modified?
- **Controls**: Input validation, checksums, signatures, immutable audit logs

### Repudiation
- **Threat**: Actions can't be traced back to an actor
- **Questions**: Are all sensitive operations logged? Are logs tamper-evident? Can users deny their actions?
- **Controls**: Comprehensive audit logging, signed logs, non-repudiation mechanisms

### Information Disclosure
- **Threat**: Sensitive data leaks to unauthorized parties
- **Questions**: What data is exposed in errors? In logs? In API responses? Can users access other users' data?
- **Controls**: Output filtering, log redaction, access controls, encryption at rest/transit

### Denial of Service
- **Threat**: System becomes unavailable or unusable
- **Questions**: Can endpoints be overwhelmed? Are there expensive operations? Can resources be exhausted?
- **Controls**: Rate limiting, resource quotas, circuit breakers, caching, input size limits

### Elevation of Privilege
- **Threat**: User gains more access than authorized
- **Questions**: Is authorization checked on every operation? Can parameters be manipulated to access other resources? Are roles properly enforced?
- **Controls**: Resource-level authorization, parameter validation, role enforcement, privilege separation

## Attack Trees

### Building an Attack Tree

```
Goal: Access User Data
├── Path A: Steal Session Token
│   ├── Phishing (requires social engineering)
│   ├── XSS (requires input injection) ← Mitigated by output encoding
│   └── Network interception (requires unencrypted traffic) ← Mitigated by HTTPS
├── Path B: Direct Database Access
│   ├── SQL Injection (requires unparameterized query) ← Mitigated by parameterized queries
│   └── Direct connection (requires network access) ← Mitigated by network segmentation
└── Path C: Abuse API
    ├── IDOR (requires missing authorization) ← Mitigated by resource checks
    └── Parameter tampering (requires missing validation) ← Mitigated by input validation
```

**Usage**: Focus on the unmitigated paths. If you find a path with no controls, that's your priority.

### Risk Scoring

For each identified threat, assess:

- **Impact** (1-5): How bad would exploitation be?
- **Likelihood** (1-5): How easy is it to exploit?
- **Risk** = Impact × Likelihood

| Score | Action |
|-------|--------|
| 20-25 | Must mitigate before release |
| 12-16 | Should mitigate in next release cycle |
| 6-10 | Track and mitigate when convenient |
| 1-5 | Accept risk, document reasoning |

## Trust Boundary Patterns

### External → Internal
- Every external request is hostile until authenticated and validated
- Validation must happen before any processing
- Never use external data to make internal decisions without verification

### Internal → External
- Assume external systems are compromised or malicious
- Validate all responses from third parties
- Don't expose internal state or identifiers

### User → User
- Users should never directly access each other's data
- All cross-user access must go through authorization checks
- Consider temporal access (can user A access user B's data at time T?)

### Process → Process
- Inter-service communication should be authenticated
- Don't trust internal network traffic by default
- Validate messages between components as if they came from outside

## Threat Modeling Checklist

For each feature or component:

- [ ] All entry points identified
- [ ] All trust boundaries mapped
- [ ] STRIDE threats considered
- [ ] Attack paths identified for high-value targets
- [ ] Existing controls mapped
- [ ] Gaps identified and prioritized
- [ ] Risk scores assigned
- [ ] Mitigations planned and scheduled
- [ ] Assumptions documented (what are we trusting?)

## Lightweight Threat Modeling

When you don't have time for full analysis:

1. **Write the user story**: "As an attacker, I want to..."
2. **Identify one critical asset**: What would hurt most to lose?
3. **Find the shortest path**: What's the easiest way to access it?
4. **Add one control**: What's the simplest mitigation?
5. **Repeat**: Do this for 3-5 attack stories

This takes 15 minutes and catches the most obvious issues.
