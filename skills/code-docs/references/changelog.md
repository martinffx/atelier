# Changelog Format

## Keep a Changelog

Follow: https://keepachangelog.com

## Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- New feature

### Changed
- Changed behavior

### Deprecated
- Soon-to-be removed feature

### Removed
- Now removed feature

### Fixed
- Bug fix

### Security
- Security improvement
```

## Version Template

```markdown
## [1.0.0] - 2024-01-15

### Added
- Users can now authenticate via OAuth
- New /api/users/:id endpoint

### Changed
- Authentication now uses JWT tokens

### Fixed
- Fixed race condition in user creation
```

## Rules

1. One version per section
2. Chronological order (newest first)
3. Link to issues/pr
4. Mention breaking changes
5. Use imperative mood

## Example Entry

```markdown
### Added
- Add user profile endpoint (#123, @username)
```
