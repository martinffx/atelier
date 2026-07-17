# Workflow: Merge PR/MR

Merge the current branch's open PR/MR after confirming CI is green.

Defaults: **squash merge + delete the source branch**. If CI is pending, abort and
report — don't block waiting unless the human says otherwise.

Start with [common.md](common.md) (platform detection, base branch, preflight).

---

## Step 1: Find or Create the Open PR/MR

Run the lookup in [common.md](common.md#find-the-open-prmr-for-the-current-branch).

- **Open** → continue to Step 2.
- **None** → run [create-pr.md](create-pr.md) first, then continue.
- **Closed/merged** → check for new commits since it was closed
  (`git log --oneline origin/<base>..HEAD`); stop if none.

---

## Step 2: Check CI Is Green

### GitHub
```bash
gh pr checks <number>            # all checks
gh pr checks <number> --required # the merge gate
```
Exit codes for `--required`: 0 = all required checks pass; non-zero includes the
pending case (exit 8). Use `gh pr checks <number> --watch` to wait if the human
asks for it.

`--required` only shows required checks. If the full run shows failing **optional**
checks (lint, coverage, etc.), warn the human before proceeding — don't silently
ignore them.

### GitLab
```bash
glab ci status
# or
glab pipeline status
```

If any required check is **pending**, offer auto-merge instead of a direct merge:
`gh pr merge --auto` (GitHub) or `glab mr merge --auto-merge` (GitLab) queues the
merge to run once checks pass. A bare `gh pr merge` fails while required checks
are pending — "merge anyway" does not work in that state. Note: `glab mr merge`
enables auto-merge by default while a pipeline is running.

If any required check is **failing**, stop and report the status to the human.
Don't merge on red. If the human says "merge anyway": on GitHub a forced merge
requires `--admin` (bypasses branch protection, needs admin rights on the repo) —
state that implication explicitly before using it. On GitLab, merging on red is
controlled by project settings — ask the human to fix the pipeline or adjust the
setting.

---

## Step 3: Confirm Before Merging

**Show the human:**
- PR/MR URL and number/iid
- CI status (green/red)
- Merge strategy (squash by default)
- Whether the source branch will be deleted

Ask for explicit confirmation before running the merge command.

---

## Step 4: Merge

### GitHub
```bash
gh pr merge <number> --squash --delete-branch
```
Alternatives: `--rebase`, `--merge`, `--auto` (merge automatically once required
checks pass), or `--admin` (forced merge — see Step 2) per the human's request.

### GitLab
```bash
glab mr merge <iid> --squash --remove-source-branch
```
Alternatives: `--rebase`, or `--auto-merge` (merge once the pipeline succeeds —
already the default while a pipeline is running) per the human's request.

---

## Step 5: Report

Show the human the merge result — the merge commit SHA, the target branch tip, and
whether the source branch was deleted. Suggest switching back to the base branch
locally (`git checkout <base> && git pull`) if the source branch was removed. Done.