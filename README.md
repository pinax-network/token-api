# The Graph: Token API

[![.github/workflows/bun-test.yml](https://github.com/pinax-network/token-api/actions/workflows/bun-test.yml/badge.svg)](https://github.com/pinax-network/token-api/actions/workflows/bun-test.yml)
![license](https://img.shields.io/github/license/pinax-network/token-api)

### <https://thegraph.com/token-api/>

> Power your apps & AI agents with real-time token data.

📚 **[Documentation](https://thegraph.com/docs/en/token-api/quick-start/)**

![banner](public/banner.jpg)

## Overview

The Graph’s Token API lets you access blockchain token information via a GET request. This guide is designed to help you quickly integrate the Token API into your application.

The Token API provides access to onchain NFT and fungible token data, including live and historical balances, holders, prices, market data, token metadata, and token transfers. This API also uses the Model Context Protocol (MCP) to allow AI tools such as Claude to enrich raw blockchain data with contextual insights.

## Features

### Token Data

- **Real-time Balances**: Current token holdings for any wallet address
- **Token Transfers**: Historical transfer events with full transaction details
- **Token Metadata**: Symbol, name, decimals, supply, and holder information
- **Price Data**: OHLCV candlestick data and current USD prices

### NFT Support

- **NFT Ownership**: Complete NFT holdings by wallet address
- **Collection Data**: Collection metadata, supply statistics, and holder counts
- **NFT Transfers**: Full NFT transfer history and marketplace activity
- **Sales Data**: NFT marketplace sales with price and transaction details

### DeFi Integration

- **DEX Swaps**: Uniswap and Solana DEX swap events with token amounts
- **Liquidity Pools**: Pool information, token pairs, and trading fees
- **Historical Data**: Time-series data for portfolio tracking and analytics

### Multi-Chain Support

- **EVM Networks**: Ethereum, Base, Arbitrum, BSC, Polygon, Optimism, Avalanche, Unichain
- **SVM Networks**: Solana with full SPL token and DEX swap support
- **Real-time Sync**: Sub-second data latency across all supported networks

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (JavaScript runtime)
- [ClickHouse](https://clickhouse.com/) database instance
- Access to blockchain data (via Substreams or data provider)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/pinax-network/token-api.git
   cd token-api
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   # API Server Configuration
   PORT=8000
   HOSTNAME=localhost
   IDLE_TIMEOUT=60

   # ClickHouse Database
   URL=http://127.0.0.1:8123
   USERNAME=default
   PASSWORD=
   MAX_LIMIT=10000

   # Database Sources (Substreams packages)
   DBS_EVM_TRANSFERS=mainnet:evm-transfers@v0.2.0
   DBS_TOKEN=mainnet:evm-tokens@v1.14.0
   DBS_NFT=mainnet:evm-nft-tokens@v0.5.1
   DBS_UNISWAP=mainnet:evm-uniswaps@v0.1.5

   # OpenAPI Configuration
   DISABLE_OPENAPI_SERVERS=false

   # Logging
   PRETTY_LOGGING=true
   VERBOSE=true
   ```

4. **Start the development server**

   ```bash
   bun dev
   ```

   The API will be available at `http://localhost:8000`

5. **Explore the API**

   Visit the interactive documentation at `http://localhost:8000/` (when running locally)

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | HTTP server port | `8000` | No |
| `HOSTNAME` | Server hostname | `localhost` | No |
| `IDLE_TIMEOUT` | Connection idle timeout (seconds) | `60` | No |
| `URL` | ClickHouse database URL | `http://127.0.0.1:8123` | Yes |
| `USERNAME` | ClickHouse username | `default` | Yes |
| `PASSWORD` | ClickHouse password | | No |
| `MAX_LIMIT` | Maximum query result limit | `10000` | No |
| `DBS_TOKEN` | Token data source | | Yes |
| `DBS_NFT` | NFT data source | | Yes |
| `DBS_UNISWAP` | DEX data source | | Yes |
| `DISABLE_OPENAPI_SERVERS` | Disable OpenAPI server list | `false` | No |
| `PRETTY_LOGGING` | Enable pretty console logging | `true` | No |
| `VERBOSE` | Enable verbose logging | `true` | No |

## Backend Requirements

### ClickHouse Database

The Token API requires a ClickHouse database instance with the following characteristics:

- **Version**: ClickHouse 22.0+ recommended
- **Memory**: Minimum 4GB RAM for production workloads
- **Storage**: SSD recommended for optimal query performance
- **Network**: Low-latency connection to API server

### Data Pipeline

The API relies on Substreams data pipelines to populate the ClickHouse database.

**Required Substreams packages:**

- **EVM Tokens**: [substreams-evm-tokens](https://github.com/pinax-network/substreams-evm-tokens) - ERC-20 token data, transfers, and NFT information
- **Solana Tokens**: [substreams-solana](https://github.com/pinax-network/substreams-solana) - SPL token data, transfers, and DEX swap events

## Authentication

The API uses Bearer token authentication. For the live endpoint (token-api.thegraph.com), you can get your API token at [The Graph Market](https://thegraph.market).
Head over <https://thegraph.com/docs/en/token-api/quick-start/#authentication> for more information.

```bash
curl -H "Authorization: Bearer <YOUR_API_TOKEN>" \
  "..."
```

## Supported Networks

> [!TIP]
>
> Checkout the [`networks-registry`](https://github.com/graphprotocol/networks-registry) repository for reference.

### EVM Networks

- **Ethereum Mainnet** (`mainnet`)
- **Arbitrum One** (`arbitrum-one`)
- **Avalanche C-Chain** (`avalanche`)
- **Base** (`base`)
- **BNB Smart Chain** (`bsc`)
- **Polygon** (`matic`)
- **Optimism** (`optimism`)
- **Unichain** (`unichain`)

### SVM Networks

- **Solana Mainnet** (`solana`)

## Docker Deployment

### Using Pre-built Images

**Latest stable release:**

```bash
docker pull ghcr.io/pinax-network/token-api:latest
docker run -it --rm --env-file .env -p 8000:8000 ghcr.io/pinax-network/token-api:latest
```

**Development build:**

```bash
docker pull ghcr.io/pinax-network/token-api:develop
docker run -it --rm --env-file .env -p 8000:8000 ghcr.io/pinax-network/token-api:develop
```

### Building from Source

```bash
docker build -t token-api .
docker run -it --rm --env-file .env -p 8000:8000 token-api
```

## Development

### Running Tests

```bash
bun test        # Run test suite
bun lint        # Run linting
bun fix         # Fix linting and formatting issues
```

### Project Structure

```
token-api/
├── src/
│   ├── routes/          # API route handlers
│   ├── sql/            # ClickHouse query definitions
│   ├── schemas/        # OpenAPI response schemas
│   └── utils/          # Utility functions
├── tests/              # Test files
├── public/             # Static assets
└── docs/              # Documentation
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Add a changeset: `bun changeset`
7. Lint `bun lint` and fix if needed `bun fix`
8. Submit a pull request

See [Release Process](RELEASING.md) for details on changesets, versioning and release process.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Support

- **Documentation**: [API Docs](https://thegraph.com/token-api/)
- **Issues**: [GitHub Issues](https://github.com/pinax-network/token-api/issues)
- **Community**: [The Graph Discord](https://discord.gg/thegraph)
