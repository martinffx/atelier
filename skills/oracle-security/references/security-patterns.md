# Security Design Patterns

Catalog of architectural patterns for building secure systems.

## Input Validation Patterns

### Whitelist Validation
Define what's allowed, reject everything else. More secure than blacklist (define what's blocked, allow everything else).

- Specify allowed types, formats, lengths, ranges
- Reject input that doesn't match exactly
- Don't try to "fix" invalid input — reject it

### Schema Validation
Define expected structure and enforce it at the boundary.

- Types, required fields, field constraints
- Nested object validation
- Array item validation

### Sanitization vs. Validation

| Approach | When to Use | Risk |
|----------|-------------|------|
| **Validation** | Reject invalid input entirely | Low — no invalid data enters system |
| **Sanitization** | Clean input for safe use | Medium — subtle bugs in sanitization logic |
| **Encoding** | Escape for specific context | Context-dependent — wrong encoding for wrong context |

**Rule**: Validate first. Only sanitize if you understand exactly what the destination context requires.

## Authentication Patterns

### Session-Based Authentication
- Server-side session storage
- Session ID in httpOnly, secure, sameSite cookie
- Server validates session on every request

### Token-Based Authentication
- Signed token (JWT, Paseto) containing claims
- Token sent in Authorization header
- Server validates signature and expiry

### Multi-Factor Authentication
- Something you know (password)
- Something you have (device, token)
- Something you are (biometric)

**Key Decision**: Session vs. Token depends on state requirements, scale, and revocation needs.

## Authorization Patterns

### Role-Based Access Control (RBAC)
- Users assigned to roles
- Roles granted permissions
- Simple to understand and audit

### Attribute-Based Access Control (ABAC)
- Policies based on user attributes, resource attributes, environment
- More flexible but more complex
- Better for fine-grained, dynamic access control

### Resource-Level Authorization
Every operation checks: "Does this user have permission to perform this action on this specific resource?"

- Don't check once at login and assume it's valid for all subsequent actions
- Re-verify on every request that touches a resource
- Consider resource ownership, sharing, delegation

## Output Protection Patterns

### Response Filtering
Remove sensitive fields from API responses based on caller's authorization level.

- Never return internal IDs, passwords, tokens, or secrets
- Filter differently for different user types
- Consider field-level access control

### Error Message Safety
- Return generic errors to users
- Log detailed errors internally
- Never expose: stack traces, database schemas, file paths, internal IPs, system versions

## Audit and Logging Patterns

### Security Event Logging
Log events that matter for security investigations:

- Authentication attempts (success and failure)
- Authorization failures
- Sensitive data access
- Configuration changes
- Privilege escalations

### Audit Trail Requirements
- **Who**: Which user or service performed the action
- **What**: What action was performed
- **When**: Timestamp (UTC)
- **Where**: Source IP, endpoint, service
- **Result**: Success or failure
- **Context**: Relevant IDs, parameters (sanitized)

### Log Protection
- Logs should be tamper-evident (append-only, signed)
- Separate log access from application access
- Retain according to compliance requirements
- Don't log secrets, tokens, or sensitive personal data

## Secrets Management Patterns

### Environment-Based Configuration
- Secrets in environment variables, never in code
- Separate config per environment (dev, staging, prod)
- Use secret management services in production (Vault, AWS Secrets Manager, etc.)

### Secret Rotation
- Rotate credentials regularly
- Support emergency rotation
- Don't hardcode secret references

### Least-Exposure Principle
- Services should only know the secrets they absolutely need
- Don't use one API key for everything
- Separate credentials by function and scope

## Resilience Patterns

### Circuit Breaker
When a dependency fails repeatedly, stop calling it temporarily to prevent cascading failures.

- Detect failure threshold
- Open circuit (fail fast) for a period
- Half-open (test with limited traffic) before fully closing

### Rate Limiting
Prevent abuse by limiting requests per time window per client.

- Different limits for different endpoints (auth vs. data)
- Different limits for different user types (anonymous vs. authenticated)
- Consider burst allowances and graceful degradation

### Timeout and Backoff
- All external calls should have timeouts
- Retry with exponential backoff for transient failures
- Don't retry authentication failures (could be brute force)

## Data Protection Patterns

### Encryption at Rest
- Sensitive data encrypted in database
- Key management separate from data access
- Consider performance impact on queries

### Encryption in Transit
- TLS for all external communication
- Consider mTLS for service-to-service
- Don't disable certificate verification

### Tokenization
Replace sensitive data with non-sensitive equivalents.

- Actual data stored in secure vault
- Token used in application logic
- Reduces exposure surface

## Secure Defaults Patterns

### Deny by Default
- All access denied unless explicitly granted
- All features disabled unless explicitly enabled
- All connections rejected unless explicitly allowed

### Minimal Surface Area
- Don't expose features you don't need
- Disable unused endpoints, services, protocols
- Remove default accounts and sample data

### Secure Configuration
- Framework defaults should be hardened
- Don't rely on "out of the box" security
- Explicitly configure security settings

## Defense in Depth Patterns

### Layered Controls
Multiple independent controls for the same threat:

```
Threat: SQL Injection
├── Layer 1: Input validation (reject non-matching input)
├── Layer 2: Parameterized queries (prevent interpretation as SQL)
├── Layer 3: Least privilege database user (limit damage if bypassed)
└── Layer 4: Monitoring (detect and alert on suspicious patterns)
```

### Compartmentalization
- Separate sensitive operations from general operations
- Isolate user data by tenant or scope
- Use different credentials for different functions

### Fail-Safe States
- When validation fails: reject
- When auth fails: deny
- When encryption fails: don't send
- When logging fails: fail closed (don't proceed silently)

## Anti-Patterns to Avoid

### God Object Security
Putting all security logic in one place (e.g., a single middleware) instead of at each layer.

**Problem**: Bypass the middleware, bypass all security.
**Fix**: Security at every relevant layer.

### Client-Side Security
Relying on browser validation, hidden fields, or client logic for security.

**Problem**: Clients are completely under attacker control.
**Fix**: Server-side validation is the only validation that matters.

### Security Through Obscurity
Relying on secrecy of design or implementation for security.

**Problem**: Once discovered (and it will be), there's no protection.
**Fix**: Assume attackers know your design. Security should work even when public.

### Trusting the Network
Assuming internal network traffic is safe.

**Problem**: Lateral movement after initial compromise is common.
**Fix**: Authenticate and validate internal traffic too.

### Hardcoded Secrets
Embedding credentials, keys, or tokens in source code.

**Problem**: Committed to version control, visible to anyone with code access.
**Fix**: Environment variables, secret managers, runtime injection.
