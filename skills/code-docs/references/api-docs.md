# API Documentation Tools

## TypeScript/JavaScript

### TypeDoc

```bash
npm install --save-dev typedoc

# Generate
npx typedoc --out docs src/index.ts

# Options
--entryPoints src/
--out docs/
--name "My Project"
--theme default
```

### JSDoc

```bash
npm install --save-dev jsdoc

# Generate
npx jsdoc src/ -d docs/

# Config (jsdoc.json)
{
  "source": {
    "includePattern": ".+\\.js(doc)?$"
  },
  "opts": {
    "destination": "./docs/"
  }
}
```

---

## Python

### Sphinx

```bash
pip install sphinx

# Initialize
sphinx-quickstart

# Build
make html
```

### pdoc

```bash
pip install pdoc

# Generate
pdoc --output-dir docs src/
pdoc --logo logo.png src/  # With logo
```

---

## Go

### godoc

```bash
# Install
go install golang.org/x/tools/cmd/godoc@latest

# Run locally
godoc -http=:6060
```

### swag (OpenAPI)

```bash
go install github.com/swaggo/swag/cmd/swag@latest

# Generate from annotations
swag init -g cmd/server/main.go
```

---

## OpenAPI/Swagger

### tools

- swagger-cli validate
- @apidevtools/swagger-cli
- redoc CLI

### Annotations Example

```javascript
/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users
 *     responses:
 *       200:
 *         description: User list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
```
