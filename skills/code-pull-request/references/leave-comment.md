# Workflow: Leave a Comment

Post a new top-level comment on the current branch's open PR/MR.

Start with [common.md](common.md) (platform detection, find the open PR/MR).

---

## Step 1: Find the Open PR/MR

Run the lookup in [common.md](common.md#find-the-open-prmr-for-the-current-branch).
If none is open, stop — nothing to comment on.

---

## Step 2: Compose the Comment

Ask the human for the comment body. Accept either:

- Their exact text, or
- A draft you generate (e.g., a status update, summary, or question) that they edit.

Prefer passing the body via stdin or a temp file to avoid shell-escaping issues with
quotes, backticks, or `$` in the message:

```bash
gh pr comment <number> --body-file -
glab mr note <iid> --message-file -   # if supported; otherwise --message
```

---

## Step 3: Confirm and Post

**Show the human the final comment text and target PR/MR. Ask for confirmation
before running the write command.**

### GitHub
```bash
gh pr comment <number> --body "<body>"
```
Or via stdin to avoid escaping:
```bash
echo "$body" | gh pr comment <number> --body-file -
```

### GitLab
```bash
glab mr note <iid> --message "<body>"
```

After posting, show the human the comment URL or the updated PR/MR URL. Done. Do not
merge or make further changes unless the human asks for another workflow.