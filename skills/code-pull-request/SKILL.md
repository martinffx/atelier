---
name: code-pull-request
description: >
  Manage GitHub pull requests or GitLab merge requests: create, read/leave/respond to
  comments, and merge. Triggers on "open a PR", "make a PR", "merge this PR", "merge the
  MR", "read PR comments", "leave a comment on the PR", "respond to a comment", "ship this",
  or when a feature branch is ready for review.
user-invocable: true
---

# Pull Request / Merge Request Skill

Create, comment on, and merge GitHub pull requests or GitLab merge requests for the
current branch. Assumes the relevant CLI (`gh` or `glab`) is installed and authenticated.

This skill is **create/read + write-gated**. Every write action (create PR, leave
comment, respond to comment, merge) requires explicit human confirmation before running.

---

## Start Here

1. Detect the platform and find the current branch's open PR/MR — see
   [references/common.md](references/common.md).
2. Pick a workflow:

| Workflow | Reference | Trigger phrases |
|----------|-----------|------------------|
| Create PR/MR | [create-pr.md](references/create-pr.md) | "open a PR", "make a PR", "submit for review" |
| Read comments | [read-comments.md](references/read-comments.md) | "read PR comments", "show MR comments" |
| Leave a comment | [leave-comment.md](references/leave-comment.md) | "leave a comment", "comment on the PR" |
| Respond to a comment | [respond-to-comment.md](references/respond-to-comment.md) | "respond to a comment", "reply on the PR" |
| Merge PR/MR | [merge-pr.md](references/merge-pr.md) | "merge this PR", "ship it", "merge the MR" |

Both GitHub (`gh`) and GitLab (`glab`) are first-class. Every write step pauses for
human approval before running the CLI command.