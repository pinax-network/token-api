# ERC20 Token API

[![.github/workflows/bun-test.yml](https://github.com/pinax-network/erc20-token-api/actions/workflows/bun-test.yml/badge.svg)](https://github.com/pinax-network/erc20-token-api/actions/workflows/bun-test.yml)

> ERC-20 tokens balances and transfers

## REST API

### Usage

| Method | Path | Query parameters<br>(* = **Required**) | Description |
| :---: | --- | --- | --- |
| GET <br>`text/html` | `/` | - | [Stoplight](https://stoplight.io/) API playground |
| GET <br>`application/json` | `/account/balances` | **`account*`**<br>`contract`<br>`limit`<br>`page` | Token balances of an account |

### Docs

|           Method           | Path       | Description                                        |
| :------------------------: | ---------- | -------------------------------------------------- |
| GET <br>`application/json` | `/openapi` | [OpenAPI](https://www.openapis.org/) specification |
| GET <br>`application/json` | `/version` | API version and Git short commit hash              |

### Monitoring

|        Method        | Path       | Description                                  |
| :------------------: | ---------- | -------------------------------------------- |
| GET <br>`application/json` | `/head`  | Current head block for which data is available |
| GET <br>`text/plain` | `/health`  | Checks database connection                   |
| GET <br>`text/plain` | `/metrics` | [Prometheus](https://prometheus.io/) metrics |

## Requirements

- [ClickHouse](clickhouse.com/)
- A [Substreams sink](https://substreams.streamingfast.io/reference-and-specs/glossary#sink) for loading data into ClickHouse. We recommend [Substreams Sink ClickHouse](https://github.com/pinax-network/substreams-sink-clickhouse/) or [Substreams Sink SQL](https://github.com/pinax-network/substreams-sink-sql). You should use the generated [`protobuf` files](tsp-output/@typespec/protobuf) to build your substream. This Token API makes use of the [`substreams-erc20`](https://github.com/pinax-network/substreams-erc20) substream.

### API stack architecture

![Token API architecture diagram](token_api_architecture_diagram.png)

### Setting up the database backend (ClickHouse)

> Coming soon...

## [`Bun` Binary Releases](https://github.com/pinax-network/antelope-token-api/releases)

> [!WARNING]
> Linux x86 only

```console
$ wget https://github.com/pinax-network/erc20-token-api/releases/download/v2.0.0/erc20-token-api
$ chmod +x ./erc20-token-api
$ ./erc20-token-api --help
Usage: erc20-token-api [options]

ERC-20 tokens balances and transfers

Options:
  -V, --version                    output the version number
  -p, --port <number>              HTTP port on which to attach the API (default: "8080", env: PORT)
  --hostname <string>              Server listen on HTTP hostname (default: "localhost", env: HOSTNAME)
  --host <string>                  Database HTTP hostname (default: "http://localhost:8123", env: HOST)
  --database <string>              The database to use inside ClickHouse (default: "default", env: DATABASE)
  --username <string>              Database user (default: "default", env: USERNAME)
  --password <string>              Password associated with the specified username (default: "", env: PASSWORD)
  --max-limit <number>             Maximum LIMIT queries (default: 10000, env: MAX_LIMIT)
  --max-rows-trigger <number>      Queries returning rows above this treshold will be considered large queries for metrics (default: 10000000, env:
                                   LARGE_QUERIES_ROWS_TRIGGER)
  --max-bytes-trigger <number>     Queries processing bytes above this treshold will be considered large queries for metrics (default: 1000000000,
                                   env: LARGE_QUERIES_BYTES_TRIGGER)
  --request-idle-timeout <number>  Bun server request idle timeout (seconds) (default: 60, env: BUN_IDLE_REQUEST_TIMEOUT)
  --pretty-logging <boolean>       Enable pretty logging (default JSON) (choices: "true", "false", default: false, env: PRETTY_LOGGING)
  -v, --verbose <boolean>          Enable verbose logging (choices: "true", "false", default: false, env: VERBOSE)
  -h, --help                       display help for command
```

## `.env` Environment variables

```env
# API Server
PORT=8080
HOSTNAME=localhost

# Bun request timeout in seconds
BUN_IDLE_REQUEST_TIMEOUT=60

# Clickhouse Database
HOST=http://127.0.0.1:8123
DATABASE=default
USERNAME=default
PASSWORD=
MAX_LIMIT=500

# Logging
PRETTY_LOGGING=true
VERBOSE=true
```

## Docker environment

-   Pull from GitHub Container registry

**For latest tagged release**

```bash
docker pull ghcr.io/pinax-network/erc20-token-api:latest
```

**For head of `main` branch**

```bash
docker pull ghcr.io/pinax-network/erc20-token-api:develop
```

-   Build from source

```bash
docker build -t erc20-token-api .
```

-   Run with `.env` file

```bash
docker run -it --rm --env-file .env ghcr.io/pinax-network/erc20-token-api
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

### Quick start

Install [Bun](https://bun.sh/)

```console
$ bun install
$ bun dev
```

**Tests**

```console
$ bun lint
$ bun test
```
