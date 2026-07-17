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
gh pr checks <number> --required
```
Exit codes: 0 = all required checks pass; non-zero includes the pending case (exit 8).
Use `gh pr checks <number> --watch` to wait if the human asks for it.

### GitLab
```bash
glab ci status
# or
glab pipeline status
```

If any required check is **failing or pending**, stop and report the status to the
human. Don't merge on red. The human can override by saying "merge anyway" — in that
case skip this gate and proceed to confirmation.

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
Alternatives: `--rebase`, `--merge`, or `--auto` (merge automatically once required
checks pass) per the human's request.

### GitLab
```bash
glab mr merge <iid> --squash --remove-source-branch
```
Alternatives: `--rebase`, or `--when-pipeline-succeeds` (auto-merge once the pipeline
passes) per the human's request.

---

## Step 5: Report

Show the human the merge result — the merge commit SHA, the target branch tip, and
whether the source branch was deleted. Suggest switching back to the base branch
locally (`git checkout <base> && git pull`) if the source branch was removed. Done.