# Common: Platform Detection and PR Lookup

Shared steps used by every workflow. Run these first.

---

## Detect Platform

```bash
git remote get-url origin
```

- Contains `github.com` → use `gh` (GitHub PR)
- Contains `gitlab` → use `glab` (GitLab MR)

---

## Determine the Base Branch

```bash
base=$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
[ -n "$base" ] || base=main
echo "$base"
```

Otherwise ask the human what the base branch is.

---

## Preflight the CLI

Confirm the relevant CLI is installed and authenticated before any write:

```bash
gh auth status     # GitHub
glab auth status   # GitLab
```

If not authenticated, stop and tell the human. Don't proceed with writes.

---

## Find the Open PR/MR for the Current Branch

GitHub:

```bash
gh pr view --json state,number,url,headRefName
```

GitLab:

```bash
glab mr view --json state,iid,web_url,source_branch
```

- **Open** → use this PR/MR number/URL for comment and merge workflows.
- **Closed/merged** → for merge workflow: check for new commits
  (`git log --oneline origin/<base>..HEAD`); otherwise stop and tell the human.
- **None** → for merge workflow: run [create-pr.md](create-pr.md), then continue.
  For comment workflows: stop — nothing to comment on.

---

## Safety Guard

Refuse to operate from the default branch — that's almost always a mistake. Ask the
human to switch to a feature branch first.