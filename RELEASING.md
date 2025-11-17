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

This will create a changeset file in `.changeset` directory to be committed with your PR.

## Creating a Release

**It's simple - just create a GitHub release!** The automation handles everything else.

### Steps

1. Check what version you need to publish (locally):
   ```bash
   bun changeset:status
   ```
   This shows you what version changesets will bump to based on pending changesets.
2. Go to GitHub Releases: https://github.com/pinax-network/token-api/releases/new
3. Create a new tag matching the version from step 1: e.g., `v3.6.0`
4. Write release notes: Summarize the changes (or use "Generate release notes" button)
5. Publish the release

💥 That's it! New release will trigger GitHub action that will:
1. Consume the changeset files and update [CHANGELOG.md](CHANGELOG.md),
2. Bump the version in [package.json](package.json),
3. Commit the changes to `main`,
4. Build and publish Docker image to `ghcr.io` with version and `latest` tags.

### Pre-releases

If you want to create a pre-release (e.g., for testing), you can:
- Mark it as "pre-release" in GitHub UI, OR
- Use a tag with a hyphen suffix: `v3.6.0-pre1`, `v3.6.0-alpha1`, `v3.6.0-beta1`

The release workflow will automatically skip these and won't update the changelog or version.


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

# 4. Create PR - CI will remind you to create a changeset if you forget ✅
```

### Maintainer Flow

```bash
# 1. Merge PRs to main

# 2. Check what version will be created
bun changeset:status
# Output: "token-api 3.6.0"

# 3. Go to GitHub Releases UI
# 4. Click "Draft a new release"
# 5. Create tag matching changeset version: v3.6.0
# 6. Click "Publish release"
# 7. Done! ✅
```
