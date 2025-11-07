# Changesets Setup Summary

## ✅ What Was Installed

### Dependencies
- `@changesets/cli` - The changesets CLI tool

### Files Created
- `.changeset/config.json` - Changesets configuration
- `.changeset/README.md` - Auto-generated changesets documentation
- `.github/workflows/changeset-check.yml` - GitHub Action to enforce changesets on PRs
- `CHANGELOG.md` - Main changelog file (will be auto-updated)
- `docs/RELEASING.md` - Release process documentation

### Scripts Added to package.json
```json
{
  "changeset": "changeset",
  "changeset:version": "changeset version",
  "changeset:publish": "changeset publish"
}
```

## 🔄 Workflow

### For Contributors (Every PR)

1. **Make your changes**
2. **Create a changeset**:
   ```bash
   bun run changeset
   ```
3. **Answer the prompts**:
   - Select change type: `patch` (bug fix), `minor` (feature), or `major` (breaking change)
   - Write a summary of your changes
4. **Commit the changeset file** with your PR
5. **CI will check** that a changeset exists (or skip for bot PRs)

### For Maintainers (Release Time)

**Just create a GitHub release!**

1. Go to https://github.com/pinax-network/token-api/releases/new
2. Create a new tag (e.g., `v3.6.0`)
3. Write release notes
4. Click "Publish release"

The GitHub Action automatically:
- Consumes changesets
- Updates `CHANGELOG.md`
- Bumps `package.json` version
- Commits to main
- Builds and publishes Docker image

## 🤖 GitHub Actions

**Changeset Check** (`.github/workflows/changeset-check.yml`):
- ✅ Runs on every PR
- ✅ Checks if a changeset file exists
- ✅ Automatically skips for Renovate and Dependabot PRs
- ❌ Fails the check if no changeset is found

**Release** (`.github/workflows/release.yml`):
- ✅ Triggers when a GitHub release is published
- ✅ Skips pre-releases and tags with `-` suffix (e.g., `v3.6.0-pre1`, `v3.6.0-alpha1`)
- ✅ Validates release tag matches changeset version
- ✅ Consumes changesets and updates CHANGELOG.md
- ✅ Bumps version in package.json
- ✅ Commits changes back to main

## 📝 Changeset File Example

When you run `bun run changeset`, it creates a file like `.changeset/funny-pandas-jump.md`:

```markdown
---
"token-api": minor
---

Add new /v1/tokens endpoint for fetching token metadata
```

## 🎯 Benefits

1. **Enforced Documentation**: Every PR must document its changes
2. **Automated Changelog**: `CHANGELOG.md` is automatically generated
3. **Semantic Versioning**: Proper version bumps based on change types
4. **Git History**: Each changeset is tracked in version control
5. **Review Process**: Changesets are reviewed as part of PR review

## 🔗 Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Release Process Guide](./RELEASING.md)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
