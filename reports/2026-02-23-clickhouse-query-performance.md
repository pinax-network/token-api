# ClickHouse Query Performance Report

**Date:** 2026-02-23
**Window:** Last 24 hours
**Clusters scanned:** 3 (a, b, c)

---

## Cluster c — Critical

**Host:** ch-node890h.riv.eosn.io

| # | Query Pattern                              | Runs/24h | Peak Mem   | Avg Mem   | Total Read | Avg Duration |
|---|--------------------------------------------|----------|------------|-----------|------------|--------------|
| 1 | `SELECT e.block_num...` (NFT tokens)       | 18,568   | 165.28 GiB | 5.40 GiB  | 264.44 TiB | 2.1s         |
| 2 | `WITH source_counts...` (erc1155 metadata) | 146      | 39.55 GiB  | 17.69 GiB | 2.58 TiB   | 4.3s         |
| 3 | `WITH source_counts...` (erc721 metadata)  | 156      | 39.42 GiB  | 8.29 GiB  | 905.01 GiB | 1.9s         |
| 4 | `WITH transfers...` (contracts CTE)        | 181      | 28.57 GiB  | 13.13 GiB | 886.31 GiB | 3.3s         |
| 5 | `WITH transfers...` (contracts CTE #2)     | 122      | 14.32 GiB  | 13.94 GiB | 807.01 GiB | 3.6s         |
| 6 | `WITH transfers...` (contracts CTE #3)     | 145      | 13.88 GiB  | 12.26 GiB | 582.15 GiB | 3.0s         |
| 7 | `WITH transfers...` (contracts CTE #4)     | 140      | 12.18 GiB  | 11.48 GiB | 603.17 GiB | 2.8s         |
| 8 | `WITH output_pools...` (base dex pools)    | 144      | 10.53 GiB  | 10.49 GiB | 950.78 GiB | 4.4s         |
| 9 | `WITH transfers...` (contracts CTE #5)     | 114      | 8.05 GiB   | 6.46 GiB  | 250.11 GiB | 1.9s         |
| 10| `WITH output_pools...` (bsc dex pools)     | 144      | 7.50 GiB   | 4.27 GiB  | 735.51 GiB | 2.8s         |

## Cluster b — Moderate

**Host:** ch-node892g.riv.eosn.io

| # | Query Pattern                              | Runs/24h | Peak Mem   | Avg Mem    | Total Read | Avg Duration |
|---|--------------------------------------------|----------|------------|------------|------------|--------------|
| 1 | `WITH contracts...` (transfers CTE)        | 3,177    | 10.54 GiB  | 1.90 GiB   | 1.50 TiB   | 537ms        |
| 2 | `INSERT INTO` (bsc erc20_balances)         | 5,500    | 330.12 MiB | 52.71 MiB  | 40.41 GiB  | 211ms        |
| 3 | `INSERT INTO` (base native_balances)       | 2,047    | 122.28 MiB | 28.62 MiB  | 1.32 GiB   | 76ms         |
| 4 | `INSERT INTO` (mainnet erc20_balances)     | 3,616    | 119.39 MiB | 15.03 MiB  | 4.77 GiB   | 44ms         |
| 5 | `INSERT INTO` (bsc erc20_transfers)        | 4,827    | 112.88 MiB | 49.39 MiB  | 14.86 GiB  | 166ms        |

## Cluster a — Healthy

**Host:** ch-node889f.riv.eosn.io

| # | Query Pattern                              | Runs/24h | Peak Mem   | Avg Mem    | Total Read | Avg Duration |
|---|--------------------------------------------|----------|------------|------------|------------|--------------|
| 1 | `WITH metadata...` (SOL token info)        | 62       | 1.29 GiB   | 1.25 GiB   | 144.21 GiB | 354ms        |
| 2 | `WITH accounts...` (owner lookup)          | 1,771    | 1.20 GiB   | 285.99 MiB | 616.97 GiB | 1.3s         |
| 3 | `WITH active_filters...` (filtered query)  | 122      | 1.17 GiB   | 303.48 MiB | 33.07 GiB  | 787ms        |

---

## Recommendations

### P0 — Cluster c, Query #1 (NFT tokens)
- **18,568 runs/day**, peaks at **165 GiB**, reads **264 TiB/day**
- Full table scan on NFT token data with no apparent filtering
- Investigate missing WHERE clause or missing index

### P1 — Cluster c, Queries #2-3 (NFT metadata)
- erc1155/erc721 metadata CTEs scanning full tables at **~40 GiB peak**
- Consider materialized views or pre-aggregated summary tables

### P2 — Cluster b, Query #1 (contracts CTE)
- **3,177 runs/day** at **10.5 GiB peak**, reading **1.5 TiB/day**
- High volume but manageable duration (537ms avg)
- Query cache should help; verify cache hit rate

### P3 — Cluster c, Queries #4-7 (transfer CTEs)
- Multiple variations of the same `WITH transfers...` pattern
- Each scanning 12-28 GiB; consolidation or caching would reduce load
