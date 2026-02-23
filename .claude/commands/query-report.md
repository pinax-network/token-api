Build a ClickHouse Query Performance Report.

## Steps

1. Run the query-log script to collect data from all clusters:
   ```
   bun run query-log
   ```
   You can pass flags: `--hours <N>` (default 24), `--limit <N>` (default 30), `--sort memory|duration|read_bytes` (default memory).

2. Create a new report file at `reports/<YYYY-MM-DD>-clickhouse-query-performance.md` using today's date.

3. The report must follow this structure:

### Header
- Title: `# ClickHouse Query Performance Report`
- Date, time window, and number of clusters scanned

### Per-Cluster Sections
For each cluster, create a section with a severity label (Critical / Moderate / Healthy) based on peak memory:
- **Critical**: any query pattern with peak memory > 10 GiB
- **Moderate**: peak memory between 1 GiB and 10 GiB
- **Healthy**: all queries under 1 GiB

Each cluster section includes:
- Host URL
- **Grouped query patterns table** with columns: #, Query Pattern, Runs/24h, Peak Mem, Avg Mem, Total Read, Avg Duration, Databases, Tables
- **Longest running queries table** with columns: #, Duration, Peak Mem, User, Event Time, Query Preview, Databases, Tables

### Recommendations
Add a prioritized list of recommendations (P0, P1, P2, etc.) based on:
- P0: Queries with peak memory > 30 GiB or total read > 100 TiB/day
- P1: Queries with peak memory > 10 GiB
- P2: Queries with high run count (>1000/day) and significant memory (>1 GiB)
- P3: Patterns that could benefit from caching or consolidation

Each recommendation should note the cluster, query pattern, key metrics, and a suggested action.

## Reference
- Script: `scripts/query-log.ts`
- Config: `dbs-config.yaml` (cluster connection details)
- Previous reports: `reports/` directory
