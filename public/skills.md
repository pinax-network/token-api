# Token API - Skills

Power your apps & AI agents with real-time token data across EVM (Ethereum, Base, BSC...), SVM (Solana), and TVM (TRON) blockchains.

- **Base URL:** `https://token-api.thegraph.com`
- **Documentation:** <https://thegraph.com/docs/en/token-api/quick-start/>
- **FAQ:** <https://thegraph.com/docs/en/token-api/faq/>
- **OpenAPI schema:** `GET /openapi`

## Authentication

All data endpoints require a **Bearer token** obtained from [The Graph Market](https://thegraph.market).

```
Authorization: Bearer <your-token>
```

Alternatively, you can pass an API key header:

```
X-Api-Key: <your-api-key>
```

## Common Parameters

Most list endpoints accept these pagination and sorting parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | `10` | Number of results per page (max 1000) |
| `page` | integer | `1` | Page number |

All endpoints return JSON responses.

---

## Monitoring

### `GET /v1/health`

Returns API operational status and dependency health.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skip_endpoints` | boolean | `true` | Skip endpoint response checks |

### `GET /v1/version`

Returns API version, build date, and commit information.

### `GET /v1/networks`

Returns supported blockchain networks with identifiers and metadata.

---

## EVM Endpoints

Endpoints for Ethereum-compatible chains (Ethereum, Base, BSC, Polygon, Arbitrum, etc.).

### Tokens

#### `GET /v1/evm/tokens`

Get ERC-20 token metadata (name, symbol, decimals, total supply).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network (e.g. `mainnet`, `base`, `bsc`) |
| `contract` | string | Yes | Token contract address |

#### `GET /v1/evm/tokens/native`

Get native token metadata (e.g. ETH on Ethereum).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |

### Balances

#### `GET /v1/evm/balances`

Get ERC-20 token balances for an address.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `address` | string | Yes | Wallet address (supports multiple) |
| `contract` | string | No | Filter by token contract (supports multiple) |
| `include_null_balances` | boolean | No | Include zero balances (default: `false`) |

#### `GET /v1/evm/balances/native`

Get native token balance (e.g. ETH) for an address.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `address` | string | Yes | Wallet address (supports multiple) |

#### `GET /v1/evm/balances/historical`

Get historical ERC-20 token balances over time.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `address` | string | Yes | Wallet address |
| `contract` | string | No | Filter by token contract (supports multiple) |
| `interval` | string | No | Time interval (default: `1d`) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |

#### `GET /v1/evm/balances/historical/native`

Get historical native token balances over time.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `address` | string | Yes | Wallet address |
| `interval` | string | No | Time interval (default: `1d`) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |

### Transfers

#### `GET /v1/evm/transfers`

Get ERC-20 token transfer events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `transaction_id` | string | No | Filter by transaction hash (supports multiple) |
| `contract` | string | No | Filter by token contract (supports multiple) |
| `from_address` | string | No | Filter by sender (supports multiple) |
| `to_address` | string | No | Filter by receiver (supports multiple) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block number |
| `end_block` | integer | No | End block number |

#### `GET /v1/evm/transfers/native`

Get native token (e.g. ETH) transfer events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `transaction_id` | string | No | Filter by transaction hash (supports multiple) |
| `from_address` | string | No | Filter by sender (supports multiple) |
| `to_address` | string | No | Filter by receiver (supports multiple) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block number |
| `end_block` | integer | No | End block number |

### Holders

#### `GET /v1/evm/holders`

Get ERC-20 token holders ranked by balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `contract` | string | Yes | Token contract address |

#### `GET /v1/evm/holders/native`

Get native token holders ranked by balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |

### DEX / Swaps

#### `GET /v1/evm/swaps`

Get DEX swap events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `transaction_id` | string | No | Filter by transaction hash (supports multiple) |
| `factory` | string | No | Filter by factory address (supports multiple) |
| `pool` | string | No | Filter by pool address (supports multiple) |
| `caller` | string | No | Filter by caller address (supports multiple) |
| `sender` | string | No | Filter by sender address (supports multiple) |
| `recipient` | string | No | Filter by recipient address (supports multiple) |
| `input_contract` | string | No | Filter by input token contract (supports multiple) |
| `output_contract` | string | No | Filter by output token contract (supports multiple) |
| `protocol` | string | No | Filter by DEX protocol |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block number |
| `end_block` | integer | No | End block number |

#### `GET /v1/evm/dexes`

Get supported DEX protocols.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |

### Liquidity Pools

#### `GET /v1/evm/pools`

Get DEX liquidity pools.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `factory` | string | No | Filter by factory address (supports multiple) |
| `pool` | string | No | Filter by pool address (supports multiple) |
| `input_token` | string | No | Filter by input token (supports multiple) |
| `output_token` | string | No | Filter by output token (supports multiple) |
| `protocol` | string | No | Filter by DEX protocol |

#### `GET /v1/evm/pools/ohlc`

Get OHLCV (Open-High-Low-Close-Volume) candlestick data for a liquidity pool.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `pool` | string | Yes | Pool address |
| `interval` | string | No | Candlestick interval (default: `1d`) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |

### NFTs (EVM only)

#### `GET /v1/evm/nft/collections`

Get NFT collection metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `contract` | string | Yes | NFT collection contract address |

#### `GET /v1/evm/nft/items`

Get individual NFT items in a collection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `contract` | string | Yes | NFT collection contract address |
| `token_id` | string | No | Filter by token ID (supports multiple) |

#### `GET /v1/evm/nft/transfers`

Get NFT transfer events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `type` | string | No | Transfer type filter |
| `transaction_id` | string | No | Filter by transaction hash (supports multiple) |
| `contract` | string | No | Filter by collection contract (supports multiple) |
| `token_id` | string | No | Filter by token ID (supports multiple) |
| `address` | string | No | Filter by address (supports multiple) |
| `from_address` | string | No | Filter by sender (supports multiple) |
| `to_address` | string | No | Filter by receiver (supports multiple) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block number |
| `end_block` | integer | No | End block number |

#### `GET /v1/evm/nft/holders`

Get NFT holders for a collection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `contract` | string | Yes | NFT collection contract address |

#### `GET /v1/evm/nft/sales`

Get NFT sale events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `transaction_id` | string | No | Filter by transaction hash (supports multiple) |
| `contract` | string | No | Filter by collection contract (supports multiple) |
| `token_id` | string | No | Filter by token ID (supports multiple) |
| `address` | string | No | Filter by address (supports multiple) |
| `from_address` | string | No | Filter by seller (supports multiple) |
| `to_address` | string | No | Filter by buyer (supports multiple) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block number |
| `end_block` | integer | No | End block number |

#### `GET /v1/evm/nft/ownerships`

Get NFT ownerships by address.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `address` | string | Yes | Wallet address (supports multiple) |
| `contract` | string | No | Filter by collection contract (supports multiple) |
| `token_id` | string | No | Filter by token ID (supports multiple) |
| `token_standard` | string | No | Filter by token standard |
| `include_null_balances` | boolean | No | Include zero balances (default: `false`) |

---

## SVM Endpoints

Endpoints for Solana Virtual Machine chains.

### Tokens

#### `GET /v1/svm/tokens`

Get SPL token metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network (e.g. `solana`) |
| `mint` | string | Yes | Token mint address |

### Balances

#### `GET /v1/svm/balances`

Get SPL token balances for an owner.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `owner` | string | Yes | Wallet owner address (supports multiple) |
| `token_account` | string | No | Filter by token account (supports multiple) |
| `mint` | string | No | Filter by token mint (supports multiple) |
| `program_id` | string | No | Filter by program ID |
| `include_null_balances` | boolean | No | Include zero balances (default: `false`) |

#### `GET /v1/svm/balances/native`

Get native SOL balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `address` | string | Yes | Wallet address (supports multiple) |
| `include_null_balances` | boolean | No | Include zero balances (default: `false`) |

### Transfers

#### `GET /v1/svm/transfers`

Get SPL token transfer events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `signature` | string | No | Filter by transaction signature (supports multiple) |
| `source` | string | No | Filter by source account (supports multiple) |
| `destination` | string | No | Filter by destination account (supports multiple) |
| `authority` | string | No | Filter by authority (supports multiple) |
| `mint` | string | No | Filter by token mint (supports multiple) |
| `program_id` | string | No | Filter by program ID |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block (slot) number |
| `end_block` | integer | No | End block (slot) number |

### Holders

#### `GET /v1/svm/holders`

Get SPL token holders ranked by balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `mint` | string | Yes | Token mint address |

### DEX / Swaps

#### `GET /v1/svm/swaps`

Get DEX swap events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `signature` | string | No | Filter by transaction signature (supports multiple) |
| `amm` | string | No | Filter by AMM address (supports multiple) |
| `amm_pool` | string | No | Filter by AMM pool address (supports multiple) |
| `user` | string | No | Filter by user address (supports multiple) |
| `input_mint` | string | No | Filter by input token mint (supports multiple) |
| `output_mint` | string | No | Filter by output token mint (supports multiple) |
| `program_id` | string | No | Filter by program ID (supports multiple) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block (slot) number |
| `end_block` | integer | No | End block (slot) number |

#### `GET /v1/svm/dexes`

Get supported DEX protocols.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |

### Liquidity Pools

#### `GET /v1/svm/pools`

Get DEX liquidity pools.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `amm` | string | No | Filter by AMM address (supports multiple) |
| `amm_pool` | string | No | Filter by AMM pool address (supports multiple) |
| `input_mint` | string | No | Filter by input token mint (supports multiple) |
| `output_mint` | string | No | Filter by output token mint (supports multiple) |
| `program_id` | string | No | Filter by program ID (supports multiple) |

#### `GET /v1/svm/pools/ohlc`

Get OHLCV candlestick data for a liquidity pool.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `amm_pool` | string | Yes | AMM pool address |
| `interval` | string | No | Candlestick interval (default: `1d`) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |

### Account Owner

#### `GET /v1/svm/owner`

Look up the owner of a Solana account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `account` | string | Yes | Account address (supports multiple) |

---

## TVM Endpoints

Endpoints for TRON Virtual Machine chains.

### Tokens

#### `GET /v1/tvm/tokens`

Get TRC-20 token metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network (e.g. `tron`) |
| `contract` | string | Yes | Token contract address |

#### `GET /v1/tvm/tokens/native`

Get native TRX token metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |

### Transfers

#### `GET /v1/tvm/transfers`

Get TRC-20 token transfer events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `transaction_id` | string | No | Filter by transaction hash (supports multiple) |
| `contract` | string | No | Filter by token contract (supports multiple) |
| `from_address` | string | No | Filter by sender (supports multiple) |
| `to_address` | string | No | Filter by receiver (supports multiple) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block number |
| `end_block` | integer | No | End block number |

#### `GET /v1/tvm/transfers/native`

Get native TRX transfer events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `transaction_id` | string | No | Filter by transaction hash (supports multiple) |
| `from_address` | string | No | Filter by sender (supports multiple) |
| `to_address` | string | No | Filter by receiver (supports multiple) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block number |
| `end_block` | integer | No | End block number |

### DEX / Swaps

#### `GET /v1/tvm/swaps`

Get DEX swap events.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `transaction_id` | string | No | Filter by transaction hash (supports multiple) |
| `factory` | string | No | Filter by factory address (supports multiple) |
| `pool` | string | No | Filter by pool address (supports multiple) |
| `caller` | string | No | Filter by caller address (supports multiple) |
| `sender` | string | No | Filter by sender address (supports multiple) |
| `recipient` | string | No | Filter by recipient address (supports multiple) |
| `input_contract` | string | No | Filter by input token contract (supports multiple) |
| `output_contract` | string | No | Filter by output token contract (supports multiple) |
| `protocol` | string | No | Filter by DEX protocol |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
| `start_block` | integer | No | Start block number |
| `end_block` | integer | No | End block number |

#### `GET /v1/tvm/dexes`

Get supported DEX protocols.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |

### Liquidity Pools

#### `GET /v1/tvm/pools`

Get DEX liquidity pools.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `factory` | string | No | Filter by factory address (supports multiple) |
| `pool` | string | No | Filter by pool address (supports multiple) |
| `input_token` | string | No | Filter by input token (supports multiple) |
| `output_token` | string | No | Filter by output token (supports multiple) |
| `protocol` | string | No | Filter by DEX protocol |

#### `GET /v1/tvm/pools/ohlc`

Get OHLCV candlestick data for a liquidity pool.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `network` | string | Yes | Blockchain network |
| `pool` | string | Yes | Pool address |
| `interval` | string | No | Candlestick interval (default: `1d`) |
| `start_time` | string | No | Start time (ISO 8601) |
| `end_time` | string | No | End time (ISO 8601) |
