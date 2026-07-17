# Default PR/MR Template

Fallback body template when the repository has no `.github/PULL_REQUEST_TEMPLATE.md`
or `.gitlab/merge_request_template.md`. Fill each section from the conventional
commits and diff.

```markdown
## Summary
<!-- One or two sentences: what and why -->

## Changes
<!-- Bulleted, grouped by area. Each bullet self-contained. -->
-

## Testing
<!-- How it was verified: test commands run, manual steps, edge cases checked -->

## Checklist
- [ ] Tests pass
- [ ] Commits follow conventional format
- [ ] Documentation updated (if needed)

## Linked Issues
<!-- Closes #123, Fixes #456, Relates to #789 -->
```
