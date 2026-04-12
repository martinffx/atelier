# Security Tools

## Node.js

### npm audit

```bash
npm audit
npm audit fix
npm audit --audit-level=high
```

### Snyk

```bash
npm install -g snyk
snyk auth
snyk test
snyk monitor
```

### ESLint Security

```bash
npm install --save-dev eslint-plugin-security
```

.eslintrc.json:
```json
{
  "plugins": ["security"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-fs-filename": "error"
  }
}
```

---

## Python

### pip-audit

```bash
pip install pip-audit
pip-audit
```

### Bandit

```bash
pip install bandit
bandit -r src/
bandit -r src/ -f json -o report.json
```

### Safety

```bash
pip install safety
safety check
safety check --json
```

---

## Go

### govulncheck

```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

### gosec

```bash
go install github.com/securego/gosec/cmd/gosec@latest
gosec ./...
```

---

## Multi-Language

### Trivy

```bash
brew install trivy
trivy fs .
trivy fs --severity HIGH,CRITICAL .
trivy image myimage:latest
```

### OWASP ZAP

```bash
# Docker
docker run -p 8080:8080 owasp/zap2docker-stable zap-baseline.py -t https://example.com
```
