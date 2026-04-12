# OWASP Top 10 (2021)

## A01: Broken Access Control

Users acting outside their intended permissions.

**Check:**
- Enforce authorization on every request
- Don't rely on hidden URLs
- Disable directory listing
- Log access control failures

**Patterns:**
```javascript
// Check permission
if (user.id !== resource.ownerId) {
  throw new ForbiddenError();
}
```

---

## A02: Cryptographic Failures

Data exposure due to weak cryptography.

**Check:**
- Encrypt sensitive data at rest
- Use strong encryption (AES-256, RSA-2048+)
- Don't use deprecated algorithms (MD5, SHA1)
- Proper key management

---

## A03: Injection

User data interpreted as code.

**Types:**
- SQL
- NoSQL
- OS Command
- LDAP
- Expression Language

**Prevention:**
- Parameterized queries
- Input validation
- Escape output

---

## A04: Insecure Design

Missing security controls in design.

**Check:**
- Threat modeling
- Secure design patterns
- Segregation of duties

---

## A05: Security Misconfiguration

Incorrect security settings.

**Check:**
- Default credentials
- Unnecessary features
- Error handling (no stack traces)
- Security headers

---

## A06: Vulnerable Components

Using components with known vulnerabilities.

**Check:**
- Keep dependencies updated
- Monitor CVE feeds
- Remove unused components

---

## A07: Auth Failures

Weaknesses in authentication.

**Check:**
- Don't ship with default credentials
- Implement MFA
- Proper session handling
- Credential recovery flows

---

## A08: Software/Data Integrity Failures

Assuming software updates are safe.

**Check:**
- Verify integrity (signatures, checksums)
- Don't use untrusted CDNs
- CI/CD security

---

## A09: Logging Failures

Insufficient logging and monitoring.

**Check:**
- Log access control failures
- Log sensitive operations
- Don't log secrets
- Set up alerting

---

## A10: SSRF

Fetching remote resources without validating URLs.

**Check:**
- Validate URLs
- Disable HTTP redirects
- Use allowlists
