# Pinax: `SQL API`

[![.github/workflows/bun-test.yml](https://github.com/pinax-network/pinax-sql-api/actions/workflows/bun-test.yml/badge.svg)](https://github.com/pinax-network/pinax-sql-api/actions/workflows/bun-test.yml)

> Collection of SQL based APIs by built on top of [**Pinax MCP Server**](https://github.com/pinax-network/pinax-mcp-server) (powered by [Substreams](https://thegraph.com/docs/substreams)).

## Architecture

```mermaid
flowchart LR
  S1[ERC-20.spkg] --> Server
  S2[SPL Token.spkg] --> Server
  S3[eosio.token.spkg] --> Server
  Server{Pinax MCP Server} --> API{Pinax SQL API}
```

## Supported Endpoints

### Tokens
- [x] EVM
  - [ ] Native
  - [x] ERC-20
- [ ] SVN (Solana)
  - [ ] Native
  - [ ] SPL Token
- [ ] Antelope
  - [ ] Native
  - [ ] eosio.token

### Token Balances
- [x] EVM
- [ ] SVN (Solana)
- [ ] Antelope

### Token Transfers
- [x] EVM
- [ ] SVN (Solana)
- [ ] Antelope

### Token Holders
- [x] EVM
- [ ] SVN (Solana)
- [ ] Antelope

### Token Prices
- [ ] EVM
  - [ ] Uniswap V2
  - [ ] Uniswap V3
  - [ ] CurveFi
  - [ ] SushiSwap
- [ ] SVN (Solana)
  - [ ] Orca
  - [ ] Raydium
- [ ] Antelope
  - [ ] Defibox

### Transactions
- [ ] EVM
- [ ] SVN (Solana)
- [ ] Antelope

### NFTs
- [ ] EVM
- [ ] SVN (Solana)
- [ ] Antelope

## `.env` Environment variables

```env
# SQL API Server
PORT=8080
HOSTNAME=localhost

# Bun request timeout in seconds
BUN_IDLE_REQUEST_TIMEOUT=60

# MCP Server
HOST=https://beta.mcp.pinax.network
PINAX_API_KEY="f98f••••••••••••••••••••5247"

# Logging
PRETTY_LOGGING=true
VERBOSE=true
```

## Docker environment

- Pull from GitHub Container registry

**For latest tagged release**

```bash
docker pull ghcr.io/pinax-network/pinax-sql-api:latest
```

**For head of `main` branch**

```bash
docker pull ghcr.io/pinax-network/pinax-sql-api:develop
```

- Build from source

```bash
docker build \
  --build-arg GIT_COMMIT="$(git rev-parse HEAD)" \
  -t pinax-sql-api .
```

- Run with `.env` file

```bash
docker run -it --rm --env-file .env -p 3000:3000 ghcr.io/pinax-network/pinax-sql-api:develop
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

### Quick start

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
