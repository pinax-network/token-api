# NFT Query Breakdown (PR #400)

Standalone queries for each CTE in the proposed SQL files. Run each against ClickHouse to measure `rows_read` and `bytes_read`.

**Usage:** Replace parameters with real values:
- `{db_nft:Identifier}` → your NFT database name (e.g. `mainnet_nft`)
- `{contract:String}` → a contract address
- `{address:Array(String)}` → owner address(es)
- Other params as needed

**Tip:** Prefix any query with `EXPLAIN ESTIMATE` or wrap in a subquery with `count()` to check row estimates without full execution.

## Files

| File | Source | Description |
|------|--------|-------------|
| `items_evm/` | `items_evm.sql` | 6 CTEs: erc721 owners, metadata, erc1155 balances, metadata, nft_metadata, final join |
| `holders_evm/` | `holders_evm.sql` | 4 CTEs: erc721 total supply + holder stats, erc1155 total supply + holder stats |
| `ownerships_evm/` | `ownerships_evm.sql` | 6 CTEs: erc721 dedup + metadata join, erc1155 dedup + metadata join |
