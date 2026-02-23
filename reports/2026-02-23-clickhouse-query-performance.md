# ClickHouse Query Performance Report

**Date:** 2026-02-23
**Window:** Last 24 hours
**Clusters scanned:** 3 (a, b, c)

---

## Cluster c — Critical

**Host:** ch-node890h.riv.eosn.io

| # | Query Pattern                              | Runs/24h | Peak Mem   | Avg Mem   | Total Read | Avg Duration | Databases | Tables |
|---|--------------------------------------------|----------|------------|-----------|------------|--------------|-----------|--------|
| 1 | `SELECT e.block_num...` (NFT tokens)       | 18,568   | 165.28 GiB | 5.40 GiB  | 264.44 TiB | 2.1s         | eth_tokens | erc721_tokens, erc1155_tokens |
| 2 | `WITH source_counts...` (erc1155 metadata) | 146      | 39.55 GiB  | 17.69 GiB | 2.58 TiB   | 4.3s         | eth_tokens | erc1155_metadata, erc1155_transfers |
| 3 | `WITH source_counts...` (erc721 metadata)  | 156      | 39.42 GiB  | 8.29 GiB  | 905.01 GiB | 1.9s         | eth_tokens | erc721_metadata, erc721_transfers |
| 4 | `WITH transfers...` (contracts CTE)        | 181      | 28.57 GiB  | 13.13 GiB | 886.31 GiB | 3.3s         | eth_tokens | erc20_transfers, contracts |
| 5 | `WITH transfers...` (contracts CTE #2)     | 122      | 14.32 GiB  | 13.94 GiB | 807.01 GiB | 3.6s         | bsc_tokens | erc20_transfers, contracts |
| 6 | `WITH transfers...` (contracts CTE #3)     | 145      | 13.88 GiB  | 12.26 GiB | 582.15 GiB | 3.0s         | arb_tokens | erc20_transfers, contracts |
| 7 | `WITH transfers...` (contracts CTE #4)     | 140      | 12.18 GiB  | 11.48 GiB | 603.17 GiB | 2.8s         | polygon_tokens | erc20_transfers, contracts |
| 8 | `WITH output_pools...` (base dex pools)    | 144      | 10.53 GiB  | 10.49 GiB | 950.78 GiB | 4.4s         | base_tokens | dex_pools, dex_swaps |
| 9 | `WITH transfers...` (contracts CTE #5)     | 114      | 8.05 GiB   | 6.46 GiB  | 250.11 GiB | 1.9s         | optimism_tokens | erc20_transfers, contracts |
| 10| `WITH output_pools...` (bsc dex pools)     | 144      | 7.50 GiB   | 4.27 GiB  | 735.51 GiB | 2.8s         | bsc_tokens | dex_pools, dex_swaps |

## Cluster b — Moderate

**Host:** ch-node892g.riv.eosn.io

| # | Query Pattern                              | Runs/24h | Peak Mem   | Avg Mem    | Total Read | Avg Duration | Databases | Tables |
|---|--------------------------------------------|----------|------------|------------|------------|--------------|-----------|--------|
| 1 | `WITH contracts...` (transfers CTE)        | 3,177    | 10.54 GiB  | 1.90 GiB   | 1.50 TiB   | 537ms        | eth_tokens | erc20_transfers, contracts |
| 2 | `INSERT INTO` (bsc erc20_balances)         | 5,500    | 330.12 MiB | 52.71 MiB  | 40.41 GiB  | 211ms        | bsc_tokens | erc20_balances |
| 3 | `INSERT INTO` (base native_balances)       | 2,047    | 122.28 MiB | 28.62 MiB  | 1.32 GiB   | 76ms         | base_tokens | native_balances |
| 4 | `INSERT INTO` (mainnet erc20_balances)     | 3,616    | 119.39 MiB | 15.03 MiB  | 4.77 GiB   | 44ms         | eth_tokens | erc20_balances |
| 5 | `INSERT INTO` (bsc erc20_transfers)        | 4,827    | 112.88 MiB | 49.39 MiB  | 14.86 GiB  | 166ms        | bsc_tokens | erc20_transfers |

## Cluster a — Healthy

**Host:** ch-node889f.riv.eosn.io

| # | Query Pattern                              | Runs/24h | Peak Mem   | Avg Mem    | Total Read | Avg Duration | Databases | Tables |
|---|--------------------------------------------|----------|------------|------------|------------|--------------|-----------|--------|
| 1 | `WITH metadata...` (SOL token info)        | 62       | 1.29 GiB   | 1.25 GiB   | 144.21 GiB | 354ms        | sol_tokens | token_metadata |
| 2 | `WITH accounts...` (owner lookup)          | 1,771    | 1.20 GiB   | 285.99 MiB | 616.97 GiB | 1.3s         | sol_tokens | token_accounts |
| 3 | `WITH active_filters...` (filtered query)  | 122      | 1.17 GiB   | 303.48 MiB | 33.07 GiB  | 787ms        | sol_tokens | token_accounts, token_metadata |

---

## Longest Running Queries

### Cluster c

| # | Duration | Peak Mem   | User    | Event Time          | Query Preview | Databases | Tables |
|---|----------|------------|---------|---------------------|---------------|-----------|--------|
| 1 | 47.2s    | 165.28 GiB | default | 2026-02-23 08:14:32 | `SELECT e.block_num, e.contract, e.token_id, e.owner...` (NFT tokens) | eth_tokens | erc721_tokens, erc1155_tokens |
| 2 | 38.6s    | 39.55 GiB  | default | 2026-02-23 07:42:18 | `WITH source_counts AS (SELECT contract, token_id...` (erc1155 metadata) | eth_tokens | erc1155_metadata, erc1155_transfers |
| 3 | 35.1s    | 28.57 GiB  | default | 2026-02-23 09:01:05 | `WITH transfers AS (SELECT t.block_num, t.tx_hash...` (contracts CTE) | eth_tokens | erc20_transfers, contracts |
| 4 | 31.8s    | 10.53 GiB  | default | 2026-02-23 06:55:41 | `WITH output_pools AS (SELECT pool_address, token0...` (base dex pools) | base_tokens | dex_pools, dex_swaps |
| 5 | 28.4s    | 39.42 GiB  | default | 2026-02-23 10:22:09 | `WITH source_counts AS (SELECT contract, token_id...` (erc721 metadata) | eth_tokens | erc721_metadata, erc721_transfers |

### Cluster b

| # | Duration | Peak Mem   | User    | Event Time          | Query Preview | Databases | Tables |
|---|----------|------------|---------|---------------------|---------------|-----------|--------|
| 1 | 12.4s    | 10.54 GiB  | default | 2026-02-23 11:03:27 | `WITH contracts AS (SELECT address, name, symbol...` (transfers CTE) | eth_tokens | erc20_transfers, contracts |
| 2 | 8.7s     | 330.12 MiB | default | 2026-02-23 09:48:15 | `INSERT INTO bsc_tokens.erc20_balances SELECT...` (bsc balances) | bsc_tokens | erc20_balances |
| 3 | 6.2s     | 112.88 MiB | default | 2026-02-23 10:15:33 | `INSERT INTO bsc_tokens.erc20_transfers SELECT...` (bsc transfers) | bsc_tokens | erc20_transfers |

### Cluster a

| # | Duration | Peak Mem   | User    | Event Time          | Query Preview | Databases | Tables |
|---|----------|------------|---------|---------------------|---------------|-----------|--------|
| 1 | 4.8s     | 1.20 GiB   | default | 2026-02-23 10:44:52 | `WITH accounts AS (SELECT account, mint, owner...` (owner lookup) | sol_tokens | token_accounts |
| 2 | 3.1s     | 1.29 GiB   | default | 2026-02-23 08:32:19 | `WITH metadata AS (SELECT mint, name, symbol...` (SOL token info) | sol_tokens | token_metadata |
| 3 | 2.9s     | 1.17 GiB   | default | 2026-02-23 11:18:06 | `WITH active_filters AS (SELECT filter_id...` (filtered query) | sol_tokens | token_accounts, token_metadata |

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
