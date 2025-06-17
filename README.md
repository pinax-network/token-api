# The Graph: `Token API`

[![.github/workflows/bun-test.yml](https://github.com/pinax-network/token-api/actions/workflows/bun-test.yml/badge.svg)](https://github.com/pinax-network/token-api/actions/workflows/bun-test.yml)
![license](https://img.shields.io/github/license/pinax-network/token-api)

### https://thegraph.com/token-api/

> Power your apps & AI agents with real-time token data.

![banner](public/banner.jpg)

## Architecture

### 1. OpenAPI Schema Definitions

- Provide a formal, machine-readable contract for all REST endpoints, including request and response models.
- Serve as a basis for automated documentation and client/server code generation.
- Capture everything from parameter schemas to response structures to ensure consistency across different implementations.

### 2. Executable SQL Statements

- Represent raw, parameterized queries that can be directly executed within a ClickHouse environment.
- Provide an unambiguous means of data manipulation and retrieval, enabling straightforward operational transparency (e.g., paste into a ClickHouse client for immediate testing).

### 3. HTTP Routes (Wrapping Query & Parameters)

- Expose each SQL operation via HTTP endpoints, encapsulating user inputs and query parameters into well-defined APIs.
- Streamline external access to database functionality by abstracting the underlying SQL implementation from the client.

### 4. On-the-Fly Data Injection

- Accommodates immediate adjustments or patches where Substreams data is incomplete or erroneous.
- Allows custom logic to amend, replace, or enrich dataset records before they are processed or stored, ensuring robust data integrity despite upstream issues.

### 5. Substreams SQL Sink

```mermaid
flowchart LR
  S1[EVM Tokens.spkg] --> Sink{Substreams SQL Sink}
  S2[SVM Tokens.spkg] --> Sink
  S3[Antelope Tokens.spkg] --> Sink
  Sink --> Clickhouse
  Clickhouse --> API{Token API}
```

## Supported Endpoints

- [x] Balances
- [x] Holders
- [x] Tokens
- [x] Transfers
- [x] OHLC
- [x] Prices

## Supported Networks

- [x] EVM (Ethereum, Base, Arbitrum, BSC, etc.)
- [ ] SVN (Solana)
- [ ] Antelope (Vaulta, WAX, Telos, Ultra)

## Quick start

Install [Bun](https://bun.sh/)

```bash
bun install
bun dev
```

**Tests**

```bash
bun lint
bun test
```

## `.env` Environment variables

```env
# API Server
PORT=8000
HOSTNAME=localhost
IDLE_TIMEOUT=60

# Clickhouse Database
URL=http://127.0.0.1:8123
USERNAME=default
PASSWORD=
MAX_LIMIT=10000
DBS_TOKEN=mainnet:evm-tokens@v1.14.0
DBS_NFT=mainnet:evm-nft-tokens@v0.5.1
DBS_UNISWAP=mainnet:evm-uniswaps@v0.1.5

# OpenAPI
DISABLE_OPENAPI_SERVERS=false

# Logging
PRETTY_LOGGING=true
VERBOSE=true
```

## Docker environment

- Pull from GitHub Container registry

**For latest tagged release**

```bash
docker pull ghcr.io/pinax-network/token-api:latest
```

**For head of `main` branch**

```bash
docker pull ghcr.io/pinax-network/token-api:develop
```

- Build from source

```bash
docker build -t token-api .
```

- Run with `.env` file

```bash
docker run -it --rm --env-file .env -p 8000:8000 ghcr.io/pinax-network/token-api:develop
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

