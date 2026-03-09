---
name: code:security
description: >
  Security audit and vulnerability detection. Use when reviewing code for security issues,
  scanning dependencies, or addressing security concerns. Triggers on "security", "vulnerability",
  "audit", "CVE", "injection", "XSS", "SQL injection", "auth", or when the user asks to check
  for security issues.
user-invocable: true
---

# Code Security

Security audit workflow and checklist.

## The Workflow

### 1. Scan

Run automated security tools.

```bash
# Check dependencies
npm audit
pip audit
cargo audit

# Run security scanner
trivy fs .
snyk test
```

### 2. Review

Manual code review against checklist.

See references/owasp-top-10.md for common vulnerabilities.

### 3. Fix

Remediate vulnerabilities found.

### 4. Verify

Re-scan to confirm fixes.

---

## Security Checklist

### Injection

| Check | Pattern |
|-------|---------|
| SQL | Parameterized queries |
| Command | No shell execution with user input |
| XSS | Escape/validate output |
| LDAP | Escape DN components |

### Authentication

| Check | Pattern |
|-------|---------|
| Passwords | Hash with bcrypt/argon2 |
| Sessions | Secure, httpOnly cookies |
| Tokens | Short-lived, proper validation |
| MFA | Consider for sensitive ops |

### Data Protection

| Check | Pattern |
|-------|---------|
| Secrets | Never in code |
| PII | Encrypt at rest |
| Transport | HTTPS only |
| Logs | No sensitive data |

### Dependencies

| Check | Pattern |
|-------|---------|
| Vulnerabilities | Scan regularly |
| Outdated | Update promptly |
| Sources | Trusted packages only |

---

## Common Vulnerabilities

See references/vulnerability-patterns.md for detailed patterns:

### SQL Injection

```python
# BAD
query = f"SELECT * FROM users WHERE id = {user_id}"

# GOOD
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
```

### XSS

```javascript
// BAD
element.innerHTML = userInput;

// GOOD
element.textContent = userInput;
// or
element.setAttribute('title', sanitize(userInput))
```

### Command Injection

```python
# BAD
os.system(f"ping {host}")

# GOOD
subprocess.run(['ping', host])
```

### Hardcoded Secrets

```javascript
// BAD
const apiKey = "sk_live_12345";

// GOOD (environment variable)
const apiKey = process.env.API_KEY;
```

---

## Tools

See references/security-tools.md for setup and usage:

| Tool | Ecosystem | Purpose |
|------|-----------|---------|
| npm audit | Node.js | Dependency vulnerabilities |
| pip-audit | Python | Dependency vulnerabilities |
| cargo-audit | Rust | Dependency vulnerabilities |
| Snyk | Multi | Vulnerability scanning |
| Trivy | Multi | Container/infra scanning |
| OWASP ZAP | Multi | Web app scanning |
| bandit | Python | Static analysis |
| ESLint security | JS/TS | Static analysis |

---

## Output Format

After security audit:

```markdown
## Security Audit

### Scan Results
- Dependencies: 0 vulnerabilities
- Static analysis: 1 issue found

### Issues Found

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| High | SQL injection | users.py:42 | Use parameterized query |
| Medium | Hardcoded secret | config.js:5 | Use env var |

### Recommendations
1. Enable 2FA for admin accounts
2. Rotate API keys quarterly
3. Set up automated dependency scanning
```

---

## Skill Loading

- For database issues → load python:sqlalchemy or typescript:drizzle-orm
- For auth issues → load relevant auth patterns
- For deployment security → load infra skills if available
