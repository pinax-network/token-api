# Agent Guide

Start here for repository orientation and common edit routing:

- `docs/repo-navigation.md`

Before making structural changes, verify affected paths and commands against that document and the current `package.json`/`src/routes/index.ts` wiring.

## Dependencies

- Bun only: `package.json` sets `packageManager` and `devEngines`, so npm refuses to install or run scripts here. Use `bun install`, `bun run <script>` and `bun add <pkg>`.
- CI and Docker install with `bun install --frozen-lockfile`. Commit `bun.lock` with every dependency change.
- `bunfig.toml` lets `bun add` and `bun update` pick only versions published at least 5 days ago (`minimumReleaseAge = 432000`, in seconds) and saves exact versions. `.npmrc` sets `min-release-age=5` (in days) for any npm still in use.
- Never download a tool on the fly (`npx <pkg>`, `bunx <pkg>`, `<pkg>@latest`): add it as a pinned devDependency and run `bunx --no-install <bin>`.
- No Dependabot or Renovate: update dependencies by hand and review the `bun.lock` diff.
