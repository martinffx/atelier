# Workflow: Respond to a Comment

Post a new comment that references an existing comment on the current branch's PR/MR.

This workflow uses **simple reference replies** — a new top-level comment that quotes
the original — rather than platform-native threaded replies. True threaded replies
require GraphQL/REST calls and are a possible future enhancement.

Start with [common.md](common.md) (platform detection, find the open PR/MR).

---

## Step 1: Find the Open PR/MR and Read Comments

Run [common.md](common.md) to find the open PR/MR, then
[read-comments.md](read-comments.md) to list the comments.

---

## Step 2: Pick the Target Comment

Ask the human which comment to respond to. Accept any of:

- The comment's number/position in the list above
- The author's handle
- A snippet of the comment text

Confirm the target before composing the reply.

---

## Step 3: Compose the Reference Reply

Ask the human for the response body, then compose a top-level comment in this form:

```
Re: @<author>'s comment — <quoted snippet>

<response body>
```

Quote only the relevant few words of the original — don't reproduce the entire
comment. Keep the quote accurate and attributed.

---

## Step 4: Confirm and Post

**Show the human the composed reply and the target PR/MR. Ask for confirmation
before running the write command.**

Use the same CLI commands as [leave-comment.md](leave-comment.md#step-3-confirm-and-post)
to post the reply as a new top-level note.

### GitHub
```bash
gh pr comment <number> --body "<composed reply>"
```

### GitLab
```bash
glab mr note <iid> --message "<composed reply>"
```

After posting, show the human the comment URL or the updated PR/MR URL. Done. Do not
delete or edit the original comment — this skill create/posts only.