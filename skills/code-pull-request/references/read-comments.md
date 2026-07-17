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

```bash
gh pr view <number> --json comments --jq '.comments[] | {author: .author.login, body: .body, createdAt: .createdAt}'
```

Or, for a readable summary:

```bash
gh pr view <number> --comments
```

### GitLab

```bash
glab mr note list <iid>
```

For review-thread discussions:

```bash
glab mr discussion list <iid>
```

---

## Step 3: Present to the Human

Show each comment with:

- **Author** (handle)
- **Body** (full text, or first few lines if long)
- **Created at** (timestamp)
- **Type** (top-level note vs. review-thread discussion, if distinguishable)

Newest first. Group by thread if threaded discussions are returned. Don't post
anything — this is read-only.