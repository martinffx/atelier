# Red Flags

A checklist to run before finalising a design, and when reviewing one. Each flag points to the principle in [principles.md](principles.md) that fixes it. Terms follow [SKILL.md](../SKILL.md).

| Red flag | What it looks like | Fix |
|----------|--------------------|-----|
| **Shallow module** | The interface is nearly as complex as the implementation. Passes the deletion test the wrong way: deleting it removes nothing. | Deep modules (1). Merge, or move behaviour in. |
| **Information leakage** | The same design decision (format, protocol, table layout) appears in two modules. | Information hiding (8). |
| **Temporal decomposition** | Structure follows the order operations run in (read, process, write) instead of the knowledge involved. Shared knowledge ends up in several steps. | Information hiding (8); together or apart (12). |
| **Overexposure** | The interface forces callers to learn rarely used features to use the common ones. | Make the common case simple (13). |
| **Pass-through method** | A method that only forwards to another with a similar signature. | Different layers, different abstractions (11). |
| **Pass-through variable** | An argument threaded unchanged through a chain of calls. | Different layers, different abstractions (11): context object or shared module. |
| **Repetition** | The same code or check appears in many places. | Parse, don't validate (3); information hiding (8); pull complexity downward (9). |
| **Special-general mixture** | A general mechanism contains feature-specific branches. | Somewhat general-purpose modules (10). |
| **Conjoined methods** | You can't understand one method without reading another. | Together or apart (12). |
| **Comment repeats code** | The comment says what the next line plainly says. | Comments and names (14). |
| **Implementation contaminates interface** | The interface comment must describe how it works inside. | Information hiding (8); rewrite the interface comment first (14). |
| **Vague name** | `data`, `info`, `manager`, `handle`, `process`. | Comments and names (14); resolve with `oracle-domain-modelling`. |
| **Hard to pick a name** | You can't find a precise name for the thing. | The concept is unclear; settle it in `CONTEXT.md`. |
| **Hard to describe** | The interface comment is long or awkward. | The design is unclear. Redesign before documenting (14). |
| **Nonobvious code** | A reader can't tell what it does or why without effort. | Names and structure for reading (14). |

## Added for this toolkit

| Red flag | What it looks like | Fix |
|----------|--------------------|-----|
| **Stringly-typed core** | Core logic takes raw `string` or `any` and re-checks it. | Parse, don't validate (3). |
| **Flag-and-optional bag** | Several booleans and optionals where only some combinations are legal. | Make illegal states unrepresentable (4). |
| **I/O in the decision** | Business rules interleaved with queries or network calls. | Functional core, imperative shell (5). |
| **Throwing for expected failure** | `catch` blocks that parse messages; "may throw X, Y, Z". | Define errors out of existence (7), else errors as values (6). |
| **Testing past the interface** | Tests break on every refactor; many tests of internal helpers. | Test at the correct level (2). |
| **Single-adapter port** | An interface with one implementation and no test double. | Seam discipline (15). |
