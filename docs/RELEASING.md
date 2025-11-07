# Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

## For Contributors: Adding a Changeset

When you make a change that should be included in the changelog, run:

```bash
bun changeset
```

This will prompt you to:
1. Select the type of change (major, minor, patch)
2. Write a summary of your changes

The changeset will be committed with your PR. **All PRs require a changeset** (enforced by CI).

### When to Skip Changesets

Bot PRs (Renovate, Dependabot) automatically skip the changeset check.

## For Maintainers: Creating a Release

**It's simple - just create a GitHub release!** The automation handles everything else.

### Steps

1. **Check what version will be created** (locally):
   ```bash
   bun changeset status --verbose
   ```
   This shows you what version changesets will bump to based on pending changesets.

2. **Go to GitHub Releases**: https://github.com/pinax-network/token-api/releases/new

3. **Create a new tag** matching the version from step 1: e.g., `v3.6.0`

   ⚠️ **Important**: The tag must match what changesets will create, or the workflow will fail

4. **Write release notes**: Summarize the changes (or use "Generate release notes" button)

5. **Publish the release** (not as pre-release)

### Pre-releases

If you want to create a pre-release (e.g., for testing), you can:
- Mark it as "pre-release" in GitHub UI, OR
- Use a tag with a hyphen suffix: `v3.6.0-pre1`, `v3.6.0-alpha1`, `v3.6.0-beta1`

The release workflow will automatically skip these and won't update the changelog or version.

### What Happens Automatically

When you publish a release, two GitHub Actions run:

**Release Action** (`.github/workflows/release.yml`):
- ✅ Skips pre-releases and tags with `-` suffix (e.g., `v3.6.0-pre1`)
- ✅ Validates release tag matches changeset version (fails fast if mismatch)
- ✅ Consumes all changesets from `.changeset/`
- ✅ Updates `CHANGELOG.md` with all changes
- ✅ Bumps version in `package.json`
- ✅ Commits the changes back to `main`

**Docker Action** (`.github/workflows/ghcr.yml`):
- ✅ Builds Docker image
- ✅ Pushes to `ghcr.io` with version tag and `latest`

That's it! No manual version bumping, no manual changelog updates, no manual Docker builds.

## Semantic Versioning

- **Major (1.0.0)**: Breaking changes
- **Minor (0.1.0)**: New features, backwards compatible
- **Patch (0.0.1)**: Bug fixes, backwards compatible

## Example Workflow

### Developer Flow

```bash
# 1. Make changes
git checkout -b feature/new-endpoint

# 2. Add changeset
bun changeset
# Select: minor
# Summary: "Add new /v1/tokens endpoint"

# 3. Commit and push
git add .
git commit -m "feat: add new tokens endpoint"
git push

# 4. Create PR - CI will check for changeset ✅
```

### Maintainer Flow

```bash
# 1. Merge PRs to main

# 2. Check what version will be created
bun changeset status --verbose
# Output: "Packages to be bumped at minor: token-api"

# 3. Go to GitHub Releases UI
# 4. Click "Draft a new release"
# 5. Create tag matching changeset version: v3.6.0
# 6. Click "Publish release"
# 7. Done! ✅
```

GitHub Actions automatically:
- Update `CHANGELOG.md`
- Bump `package.json` version
- Commit to main
- Build and publish Docker image to `ghcr.io`
