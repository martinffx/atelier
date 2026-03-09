# Debugging Tools by Language

## Node.js

### Node Inspector / Chrome DevTools

```bash
# Start with debugging
node --inspect server.js

# Break on first line
node --inspect-brk server.js
```

Then open chrome://inspect in Chrome.

### VS Code Debugging

Create .vscode/launch.json:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server",
  "program": "${workspaceFolder}/server.js",
  "console": "integratedTerminal"
}
```

### ndb

Better debugging for Node:

```bash
npm install -g ndb
ndb server.js
```

### console.table

```javascript
const users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
console.table(users);
```

---

## Python

### pdb

```python
import pdb

def calculate():
    x = 10
    pdb.set_trace()  # Break here
    y = x * 2
    return y

# Commands: n (next), s (step), p x (print), l (list), w (where), c (continue)
```

### ipdb (better pdb)

```bash
pip install ipdb
import ipdb; ipdb.set_trace()
```

### VS Code

Just set breakpoint and press F5.

### PyCharm

Right-click → Debug.

---

## Go

### Delve

```bash
# Install
go install github.com/go-delve/delve/cmd/dlv@latest

# Run
dlv debug main.go

# Commands: n (next), s (step), p x (print), bt (backtrace), c (continue)
```

### VS Code

Just set breakpoint and press F5.

---

## Rust

### LLDB with VS Code

```json
{
  "type": "lldb",
  "request": "launch",
  "program": "${workspaceFolder}/target/debug/myapp",
  "args": ["--arg1", "value"]
}
```

### Rust Analyzer

Hover over variable → "Debug" button.

---

## Browser (JavaScript)

### Chrome DevTools

1. F12 → Sources tab
2. Find file
3. Set breakpoint
4. Refresh page

### Firefox DevTools

1. F12 → Debugger tab
2. Find file
3. Set breakpoint
4. Refresh page

### VS Code

Use "Debug JavaScript" or "Debug Edge" configuration.
