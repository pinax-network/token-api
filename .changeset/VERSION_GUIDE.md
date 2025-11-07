# Version Management Guide

## How Changesets Determines Version

Changesets automatically calculates the next version based on the **highest severity** of pending changesets:

- **patch** (bug fixes) → `3.5.3` → `3.5.4`
- **minor** (new features) → `3.5.3` → `3.6.0`
- **major** (breaking changes) → `3.5.3` → `4.0.0`

## Before Creating a Release

**Always check what version will be created:**

```bash
bunx changeset status
```

Example output:
```
🦋  info Packages to be bumped at minor:
🦋  - token-api
```

This means the next version will be a **minor** bump.

## Creating a Release

1. Run `bunx changeset status` to see the version
2. If current version is `3.5.3` and status shows `minor`, next version is `3.6.0`
3. Create GitHub release with tag `v3.6.0`
4. Publish (the workflow validates the tag matches)

## What If Versions Don't Match?

If you create a release with tag `v3.5.4` but changesets wants to bump to `v3.6.0`:

**The workflow will fail with:**
```
❌ Error: Version mismatch!
Release tag is v3.5.4 but changesets bumped version to 3.6.0

Please create a new release with tag v3.6.0 instead.

Tip: Run 'bunx changeset status' locally to see what version will be created.
```

**What to do:**
1. Delete the incorrect release
2. Create a new release with the correct tag (`v3.6.0`)

## Multiple Changesets

If you have multiple changesets with different severities, the **highest** wins:

```
.changeset/
  fix-bug.md        → patch
  new-feature.md    → minor
  breaking-change.md → major
```

Result: **major** bump (e.g., `3.5.3` → `4.0.0`)

## Tips

- ✅ Always run `bunx changeset status` before releasing
- ✅ The workflow validates and fails fast if there's a mismatch
- ✅ No commits are made if validation fails
- ✅ You can safely delete and recreate releases if needed
