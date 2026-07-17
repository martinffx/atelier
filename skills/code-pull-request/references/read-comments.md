# Workflow: Read Comments

List comments on the current branch's open PR/MR.

Start with [common.md](common.md) (platform detection, find the open PR/MR).

---

## Step 1: Find the Open PR/MR

Run the lookup in [common.md](common.md#find-the-open-prmr-for-the-current-branch).
If none is open, stop — nothing to read.

---

## Step 2: List Comments

### GitHub

Top-level comments:

```bash
gh pr view <number> --json comments --jq '.comments[] | {author: .author.login, body: .body, createdAt: .createdAt}'
```

Inline review comments (file/line threads) — `--json comments` does NOT include
them, so fetch them separately:

```bash
gh pr view <number> --json reviewThreads,reviews
```

Or, for a readable summary of top-level comments:

```bash
gh pr view <number> --comments
```

### GitLab

```bash
glab mr note list <iid>
```

This covers both top-level notes and review-thread replies — `glab` has no
separate `mr discussion` command.

---

## Step 3: Present to the Human

Show each comment with:

- **Author** (handle)
- **Body** (full text, or first few lines if long)
- **Created at** (timestamp)
- **Type** (top-level note vs. inline review comment, if distinguishable)
- **File/line** (for inline review comments)

Newest first. Group inline review comments by file/line, and threads by their
parent comment. Don't post anything — this is read-only.