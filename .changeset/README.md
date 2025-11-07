# Changesets Quick Reference

## Common Commands

```bash
# Create a new changeset (run this for every PR)
bun run changeset

# Check status of pending changesets
bunx changeset status

# Version packages (maintainers only)
bun run changeset:version

# Publish to npm (if applicable)
bun run changeset:publish
```

## Change Types

- **patch** (0.0.X) - Bug fixes, documentation, internal changes
- **minor** (0.X.0) - New features, backwards compatible
- **major** (X.0.0) - Breaking changes

## Examples

### Bug Fix (patch)
```bash
bun run changeset
# Select: patch
# Summary: "Fix null pointer error in balance endpoint"
```

### New Feature (minor)
```bash
bun run changeset
# Select: minor
# Summary: "Add support for Polygon network"
```

### Breaking Change (major)
```bash
bun run changeset
# Select: major
# Summary: "Remove deprecated /v1/legacy endpoint"
```

## Tips

- Write clear, user-facing summaries
- One changeset per logical change
- Multiple changesets in one PR is OK
- Changesets are committed with your code
- CI enforces changesets on all PRs (except bots)
