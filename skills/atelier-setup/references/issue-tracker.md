# Issue Tracker

## Tracker

- **Provider:** [GitHub, GitLab, local Markdown, another tracker, or none]
- **Location:** [repository, project, URL, or local directory]
- **Tool or procedure:** [CLI, web workflow, or local-file convention]
- **Mirror Spec-backed tasks:** [yes or no]

## Authority

`plan.json` is the source of truth for Spec-backed task descriptions, dependencies, and
validation. Tracker entries only mirror execution state when mirroring is enabled.

## Operations

- **Create:** [how to create an issue or task]
- **Read:** [how to retrieve it]
- **Update:** [how to change status or add a note]
- **Complete:** [how to close it]
- **Dependencies:** [how blockers are represented]

## Status Mapping

| Plan state | Tracker state |
|------------|---------------|
| Ready | [state] |
| In progress | [state] |
| Blocked | [state] |
| Complete | [state] |

## Constraints

- [Required approvals, project conventions, or known limitations]
- Do not store credentials, tokens, or other secrets in this document.
