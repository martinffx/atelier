# Retro report

Saved to `docs/retros/<YYYY-MM-DD>-<branch-slug>.md` only when the user approves. Later retros
read these files to answer "is this a recurring issue?", so keep the format exact: three
sections, numbered by issue, nothing else.

```markdown
# Retro: <branch> (#<PR>), <YYYY-MM-DD>
Coverage: <coverage line as reported>

## Issues identified
1. <one-line Correction> (cause: <label>; evidence: <locator>; recurring: no)
2. <one-line Correction> (cause: <label>; evidence: <locator>; recurring: yes, <earlier report file> #<n>)

## Proposed fixes
1. <target file>: <the change, one line>
2. none

## Applied fix
1. pending
2. declined
```

- **Issues identified:** in rank order. Write each Correction in your own words. Never quote a
  transcript, PR or commit, so no untrusted text or secret enters the repo.
- **evidence:** a locator only: a commit sha, a PR comment URL, or `session`. No local log paths;
  they are private and expire.
- **cause:** exactly one of `missing-check`, `misleading-text`, `rule-ignored`,
  `unreachable-info`, `hard-to-find`, `unwritten-knowledge`, `spec-gap`, `unknown`.
- **recurring:** `no`, or `yes` plus every earlier report entry it matches.
- **Proposed fixes:** same number as the issue. `none` when there is no good Nudge;
  `outside this repo` when the cause lies outside it.
- **Applied fix:** `pending` for an accepted Nudge, `declined` otherwise. In the commit that
  lands the Nudge, replace `pending` with `applied: <file>`; `git log` on the report finds the
  commit.
