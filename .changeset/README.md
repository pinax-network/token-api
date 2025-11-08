# Changesets Guide

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

## Quick Reference

### Common Commands

```bash
# Create a new changeset (run this for every PR)
bun changeset

# Check status of pending changesets
bun changeset:status

# Version packages (maintainers only - automated via GitHub Actions)
bun changeset:version

```

### Change Types

Changesets automatically calculates the next version based on the **highest severity** of pending changesets:

- **patch** (bug fixes) → `3.5.3` → `3.5.4`
- **minor** (new features) → `3.5.3` → `3.6.0`
- **major** (breaking changes) → `3.5.3` → `4.0.0`

### Examples

**Bug Fix (patch):**
```bash
bun run changeset
# Select: patch
# Summary: "Fix null pointer error in balance endpoint"
```

**New Feature (minor):**
```bash
bun run changeset
# Select: minor
# Summary: "Add support for Polygon network"
```

**Breaking Change (major):**
```bash
bun run changeset
# Select: major
# Summary: "Remove deprecated /v1/legacy endpoint"
```

## For Contributors

### Adding a Changeset

When you make a change that should be included in the changelog:

1. Run `bun run changeset`
2. Select the type of change (patch, minor, major)
3. Write a clear, user-facing summary
4. Commit the changeset file with your PR

**All PRs require a changeset** (enforced by CI, except for bot PRs).

### Tips

- Write clear, user-facing summaries
- One changeset per logical change
- Multiple changesets in one PR is OK
- Changesets are committed with your code
- CI enforces changesets on all PRs (except bots)

## For Maintainers

### Before Creating a Release

**Always check what version will be created:**

```bash
bun changeset:status
```

Example output:
```
🦋  info Packages to be bumped at patch
🦋  - token-api 3.5.4
🦋    - .changeset/migrate-hono-openapi-v1.md
```

This means the next version will be a **patch** bump to 3.5.4

### Creating a Release

1. Run `bun changeset:status` to see the version
2. If you see `3.5.4` then this will be the next version
3. Create GitHub release with tag `v3.5.4`
4. Publish (the workflow validates the tag matches)

The GitHub Action automatically:
- Validates release tag matches changeset version
- Consumes changesets and updates CHANGELOG.md
- Bumps version in package.json
- Commits changes back to main

### What If Versions Don't Match?

If you create a release with tag `v3.5.4` but changesets wants to bump to `v3.6.0`:

**The workflow will fail with:**
```
❌ Error: Version mismatch!
Release tag is v3.5.4 but changesets bumped version to 3.6.0

Please create a new release with tag v3.6.0 instead.

Tip: Run 'bun changeset:status' locally to see what version will be created.
```

**What to do:**
1. Delete the incorrect release
2. Create a new release with the correct tag (`v3.6.0`)

### Multiple Changesets

If you have multiple changesets with different severities, the **highest** wins:

```
.changeset/
  fix-bug.md        → patch
  new-feature.md    → minor
  breaking-change.md → major
```

Result: **major** bump (e.g., `3.5.3` → `4.0.0`)

### Pre-releases

To create a pre-release (for testing):
- Mark it as "pre-release" in GitHub UI, OR
- Use a tag with hyphen suffix: `v3.6.0-pre1`, `v3.6.0-alpha1`, `v3.6.0-beta1`

The release workflow will automatically skip these.

## Additional Resources

- [Release Process Guide](../RELEASING.md)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
