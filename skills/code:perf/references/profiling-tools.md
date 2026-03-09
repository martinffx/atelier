# Profiling Tools

## Node.js

### Built-in

```bash
# CPU profile
node --prof app.js
# Creates isolate-*.log

# Analyze
node --prof-process isolate-*.log

# Memory
node --inspect app.js
# Open chrome://inspect
```

### clinic.js

```bash
npm install -g clinic

# CPU + event loop
clinic doctor -- node app.js

# CPU flame graph
clinic flame -- node app.js

# Memory flame graph
clinic泡沫 -- node app.js
```

---

## Python

### cProfile

```bash
# Profile
python -m cProfile -o profile.prof app.py

# Analyze (sorted by cumulative)
python -m cProfile -s cumulative app.py

# Analyze (sorted by time)
python -m cProfile -s tottime app.py

# Interactive
python -m cProfile -m app.py
```

### line-profiler

```bash
pip install line_profiler

# Add @profile decorator
@profile
def slow_function():
    ...

# Run
kernprof -l -v app.py
```

---

## Go

### pprof

```bash
# CPU profile
go test -cpuprofile=cpu.prof -bench=.
go tool pprof cpu.prof

# Memory profile
go test -memprofile=mem.prof -bench=.
go tool pprof mem.prof

# Web UI
go tool pprof -http=:8080 cpu.prof
```

### Built-in

```bash
# Runtime stats
import runtime

func printStats() {
  var m runtime.MemStats
  runtime.ReadMemStats(&m)
  println(m.Alloc, m.TotalAlloc, m.Mallocs)
}
```

---

## Browser

### Chrome DevTools

1. Open DevTools (F12)
2. Performance tab
3. Click Record
4. Perform action
5. Click Stop
6. Analyze flame graph

### What to Look For

- Long tasks (50ms+)
- Large paint/layout
- Expensive JS functions
- Memory growth over time

### Memory Tab

- Take heap snapshot
- Compare snapshots
- Find detached DOM trees
- Track memory growth
