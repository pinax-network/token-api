import 'dotenv/config';
import { $ } from 'bun';
import { Option, program } from 'commander';
import { z } from 'zod';

import pkg from '../package.json' with { type: 'json' };
import { loadDbsConfig, type NetworkDatabaseMapping } from './config/dbsConfig.js';

// Set timezone to UTC
process.env.TZ = 'Etc/UTC';

// defaults
export const DEFAULT_PORT = '8000';
export const DEFAULT_HOSTNAME = 'localhost';
export const DEFAULT_URL = 'http://localhost:8123';
export const DEFAULT_API_URL = `http://${DEFAULT_HOSTNAME}:${DEFAULT_PORT}`;
export const DEFAULT_DATABASE = 'default';
export const DEFAULT_USERNAME = 'default';
export const DEFAULT_PASSWORD = '';
export const DEFAULT_MAX_LIMIT = 1000;
export const DEFAULT_LARGE_QUERIES_ROWS_TRIGGER = 10_000_000; // 10M rows
export const DEFAULT_LARGE_QUERIES_BYTES_TRIGGER = 1_000_000_000; // 1Gb
export const DEFAULT_DB_RESPONSE_TIME_TRIGGER_MS = 1000;
export const DEFAULT_IDLE_TIMEOUT = 60;
export const DEFAULT_PRETTY_LOGGING = false;
export const DEFAULT_VERBOSE = false;
export const DEFAULT_SORT_BY = 'DESC';
export const DEFAULT_OHLC_QUANTILE = 0.02;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_MAX_QUERY_EXECUTION_TIME = 10; // 10 seconds query timeout to match `fetch` MCP timeout
export const DEFAULT_DEFAULT_EVM_NETWORK = 'mainnet';
export const DEFAULT_DEFAULT_SVM_NETWORK = 'solana';
export const DEFAULT_DEFAULT_TVM_NETWORK = 'tron';
export const DEFAULT_LOW_LIQUIDITY_CHECK = 10000; // $10K USD
export const DEFAULT_DISABLE_OPENAPI_SERVERS = false;
export const DEFAULT_SKIP_NETWORKS_VALIDATION = false;
export const DEFAULT_REDIS_URL = 'redis://localhost:6379';
export const DEFAULT_SPAM_API_URL = 'http://localhost:3000';
// Make cache duration minimum to be same as max SQL execution time
export const DEFAULT_CACHE_DURATIONS = `${DEFAULT_MAX_QUERY_EXECUTION_TIME},600`;
export const DEFAULT_PLANS = '';

export const DEFAULT_DBS_BALANCES = 'mainnet:evm-balances@v0.2.2';
export const DEFAULT_DBS_TRANSFERS = 'mainnet:evm-transfers@v0.2.2';
export const DEFAULT_DBS_CONTRACT = 'mainnet:evm-contracts@v0.3.0';
export const DEFAULT_DBS_NFT = 'mainnet:evm-nft-tokens@v0.6.2';
export const DEFAULT_DBS_DEX = 'mainnet:evm-dex@v0.2.6';

// GitHub metadata
const GIT_COMMIT = (process.env.GIT_COMMIT ?? (await $`git rev-parse HEAD`.text())).replace(/\n/, '').slice(0, 7);
const GIT_DATE = (process.env.GIT_DATE ?? (await $`git log -1 --format=%cd --date=short`.text())).replace(/\n/, '');
const GIT_REPOSITORY = (process.env.GIT_REPOSITORY ?? (await $`git config --get remote.origin.url`.text()))
    .replace(/git@github.com:/, '')
    .replace('.git', '')
    .replace(/\n/, '');
export const GIT_APP = {
    version: pkg.version as `${number}.${number}.${number}`,
    commit: GIT_COMMIT,
    date: GIT_DATE as `${number}-${number}-${number}`,
    repo: GIT_REPOSITORY,
};
export const APP_NAME = pkg.name;
export const APP_DESCRIPTION = pkg.description;
export const APP_VERSION = `${GIT_APP.version}+${GIT_APP.commit} (${GIT_APP.date})`;

// parse command line options
const opts = program
    .name(pkg.name)
    .version(APP_VERSION)
    .description(APP_DESCRIPTION)
    .showHelpAfterError()
    .addOption(
        new Option('-p, --port <number>', 'HTTP port on which to attach the API').env('PORT').default(DEFAULT_PORT)
    )
    .addOption(
        new Option('--hostname <string>', 'Server listen on HTTP hostname').env('HOSTNAME').default(DEFAULT_HOSTNAME)
    )
    .addOption(new Option('--url <string>', 'Database HTTP hostname').env('URL').default(DEFAULT_URL))
    .addOption(new Option('--api-url <string>', 'API HTTP hostname').env('API_URL').default(DEFAULT_API_URL))
    .addOption(
        new Option('--database <string>', 'The database to use inside ClickHouse')
            .env('DATABASE')
            .default(DEFAULT_DATABASE)
    )
    .addOption(new Option('--username <string>', 'Database user for API').env('USERNAME').default(DEFAULT_USERNAME))
    .addOption(
        new Option('--password <string>', 'Password associated with the specified API username')
            .env('PASSWORD')
            .default(DEFAULT_PASSWORD)
    )
    .addOption(
        new Option('--default-evm-network <string>', 'Default EVM Network ID')
            .env('DEFAULT_EVM_NETWORK')
            .default(DEFAULT_DEFAULT_EVM_NETWORK)
    )
    .addOption(
        new Option('--default-svm-network <string>', 'Default SVM Network ID')
            .env('DEFAULT_SVM_NETWORK')
            .default(DEFAULT_DEFAULT_SVM_NETWORK)
    )
    .addOption(
        new Option('--default-tvm-network <string>', 'Default TVM Network ID')
            .env('DEFAULT_TVM_NETWORK')
            .default(DEFAULT_DEFAULT_TVM_NETWORK)
    )
    .addOption(
        new Option('--balances-databases <string>', 'Balances Clickhouse databases')
            .env('DBS_BALANCES')
            .default(DEFAULT_DBS_BALANCES)
    )
    .addOption(
        new Option('--transfers-databases <string>', 'Transfers Clickhouse databases')
            .env('DBS_TRANSFERS')
            .default(DEFAULT_DBS_TRANSFERS)
    )
    .addOption(
        new Option('--nft-databases <string>', 'NFT Clickhouse databases').env('DBS_NFT').default(DEFAULT_DBS_NFT)
    )
    .addOption(
        new Option('--dex-databases <string>', 'DEX Clickhouse databases').env('DBS_DEX').default(DEFAULT_DBS_DEX)
    )
    .addOption(
        new Option('--contract-databases <string>', 'Contract Clickhouse databases')
            .env('DBS_CONTRACT')
            .default(DEFAULT_DBS_CONTRACT)
    )
    .addOption(
        new Option('--ohlc-quantile <number>', 'High and low quantiles for OHLC aggregations')
            .env('OHLC_QUANTILE')
            .default(DEFAULT_OHLC_QUANTILE)
    )
    .addOption(new Option('--max-limit <number>', 'Maximum LIMIT queries').env('MAX_LIMIT').default(DEFAULT_MAX_LIMIT))
    .addOption(
        new Option('--max-query-execution-time <number>', 'Maximum SQL query execution time')
            .env('MAX_QUERY_EXECUTION_TIME')
            .default(DEFAULT_MAX_QUERY_EXECUTION_TIME)
    )
    .addOption(
        new Option(
            '--max-rows-trigger <number>',
            'Queries returning rows above this threshold will be considered large queries for metrics'
        )
            .env('LARGE_QUERIES_ROWS_TRIGGER')
            .default(DEFAULT_LARGE_QUERIES_ROWS_TRIGGER)
    )
    .addOption(
        new Option(
            '--max-bytes-trigger <number>',
            'Queries processing bytes above this threshold will be considered large queries for metrics'
        )
            .env('LARGE_QUERIES_BYTES_TRIGGER')
            .default(DEFAULT_LARGE_QUERIES_BYTES_TRIGGER)
    )
    .addOption(
        new Option(
            '--degraded-db-response-time <number>',
            'Maximum database response time for health check to be considered degraded'
        )
            .env('DB_RESPONSE_TIME_TRIGGER_MS')
            .default(DEFAULT_DB_RESPONSE_TIME_TRIGGER_MS)
    )
    .addOption(
        new Option('--idle-timeout <number>', 'HTTP server request idle timeout (seconds)')
            .env('IDLE_TIMEOUT')
            .default(DEFAULT_IDLE_TIMEOUT)
    )
    .addOption(
        new Option('--disable-openapi-servers <boolean>', 'Disable OpenAPI servers (used for local testing)')
            .choices(['true', 'false'])
            .env('DISABLE_OPENAPI_SERVERS')
            .default(DEFAULT_DISABLE_OPENAPI_SERVERS)
    )
    .addOption(
        new Option(
            '--skip-networks-validation <boolean>',
            'Skip networks databases validation (used for local testing)'
        )
            .choices(['true', 'false'])
            .env('SKIP_NETWORKS_VALIDATION')
            .default(DEFAULT_SKIP_NETWORKS_VALIDATION)
    )
    .addOption(
        new Option('--pretty-logging <boolean>', 'Enable pretty logging (default JSON)')
            .choices(['true', 'false'])
            .env('PRETTY_LOGGING')
            .default(DEFAULT_PRETTY_LOGGING)
    )
    .addOption(
        new Option('-v, --verbose <boolean>', 'Enable verbose logging')
            .choices(['true', 'false'])
            .env('VERBOSE')
            .default(DEFAULT_VERBOSE)
    )
    .addOption(new Option('--redis-url <string>', 'Redis connection URL').env('REDIS_URL').default(DEFAULT_REDIS_URL))
    .addOption(
        new Option('--dbs-config-path <string>', 'Path to database configuration YAML file').env('DBS_CONFIG_PATH')
    )
    .addOption(
        new Option('--spam-api-url <string>', 'URL for the spam scoring API')
            .env('SPAM_API_URL')
            .default(DEFAULT_SPAM_API_URL)
    )
    .addOption(
        new Option('--cache-durations <numbers>', 'Default cache durations in seconds (comma-separated)')
            .env('CACHE_DURATIONS')
            .default(DEFAULT_CACHE_DURATIONS)
    )
    .addOption(
        new Option('--plans <string>', 'Plan configurations (name:limit,batched,bars,intervals)')
            .env('PLANS')
            .default(DEFAULT_PLANS)
    )
    .parse()
    .opts();

function parseDatabases(dbs: string): Record<string, NetworkDatabaseMapping> {
    return Object.assign(
        {},
        ...dbs
            .split(';')
            .map((db) => {
                const [network_id, ...rest] = db.split(':');
                const db_suffix = rest.join(':');

                if (!network_id || !db_suffix) throw new Error(`Invalid config: Malformed database entry: "${db}".`);

                return {
                    // Temporary hardcoding rename of `matic` to `polygon`
                    [network_id === 'matic' ? 'polygon' : network_id]: {
                        database: `${network_id}:${db_suffix}`,
                        // TODO: Get type from registry
                        type: network_id === 'solana' ? 'svm' : network_id === 'tron' ? 'tvm' : 'evm',
                        cluster: '', // Empty cluster for env-based config (uses default connection)
                    },
                };
            })
            .filter(Boolean)
    );
}

const config = z
    .object({
        port: z
            .string()
            .regex(/^\d+$/, 'Port must be numeric')
            .transform(Number)
            .refine((val) => val > 0 && val < 65536, 'Port must be between 1-65535'),
        hostname: z.string().min(1, 'Hostname cannot be empty'),
        url: z.string().url({ message: 'Invalid Database URL' }),
        apiUrl: z.string().url({ message: 'Invalid API URL' }),
        database: z.string().min(1, 'Database name cannot be empty'),
        username: z.string().min(1, 'Username cannot be empty'),
        password: z.string(),
        defaultEvmNetwork: z.string().min(1, 'Default EVM network cannot be empty'),
        defaultSvmNetwork: z.string().min(1, 'Default SVM network cannot be empty'),
        defaultTvmNetwork: z.string().min(1, 'Default TVM network cannot be empty'),
        balancesDatabases: z
            .string()
            .optional()
            .transform((val) => (val ? parseDatabases(val) : {})),
        transfersDatabases: z
            .string()
            .optional()
            .transform((val) => (val ? parseDatabases(val) : {})),
        nftDatabases: z
            .string()
            .optional()
            .transform((val) => (val ? parseDatabases(val) : {})),
        dexDatabases: z
            .string()
            .optional()
            .transform((val) => (val ? parseDatabases(val) : {})),
        contractDatabases: z
            .string()
            .optional()
            .transform((val) => (val ? parseDatabases(val) : {})),
        ohlcQuantile: z.coerce.number().positive('OHLC quantile must be positive'),
        maxLimit: z.coerce.number().positive('Max limit must be positive'),
        maxQueryExecutionTime: z.coerce.number().positive('Max query execution time must be positive'),
        maxRowsTrigger: z.coerce.number().positive('Max rows trigger must be positive'),
        maxBytesTrigger: z.coerce.number().positive('Max bytes trigger must be positive'),
        degradedDbResponseTime: z.coerce.number().positive('Max response time must be positive'),
        idleTimeout: z.coerce.number().nonnegative('Idle timeout must be non-negative'),
        // `z.coerce.boolean` doesn't parse boolean string values as expected (see https://github.com/colinhacks/zod/issues/1630)
        prettyLogging: z.coerce.string().transform((val) => val.toLowerCase() === 'true'),
        disableOpenapiServers: z.coerce.string().transform((val) => val.toLowerCase() === 'true'),
        skipNetworksValidation: z.coerce.string().transform((val) => val.toLowerCase() === 'true'),
        verbose: z.coerce.string().transform((val) => val.toLowerCase() === 'true'),
        redisUrl: z.string().url({ message: 'Invalid Redis URL' }),
        dbsConfigPath: z.string().optional(),
        spamApiUrl: z.string().url({ message: 'Invalid Spam API URL' }),
        cacheDurations: z
            .string()
            .transform((val) => {
                if (!val) return [];
                return val
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0)
                    .map((s) => {
                        const num = Number(s);
                        if (Number.isNaN(num)) throw new Error(`Invalid duration: ${s}`);
                        return num;
                    });
            })
            .pipe(
                z
                    .array(z.number().nonnegative('Cache duration must be non-negative'))
                    .min(2, { message: 'At least two cache durations are required' })
            ),
        plans: z.string().transform((val) => {
            // Empty config means bypass plan limits (for local development)
            if (!val || val.trim() === '') {
                return null;
            }

            const plans = new Map<
                string,
                {
                    maxLimit: number;
                    maxBatched: number;
                    maxBars: number;
                    allowedIntervals: string[];
                }
            >();

            val.split(';').forEach((planDef) => {
                const [name, limits] = planDef.split(':');
                if (!name || !limits) {
                    throw new Error(`Malformed plan entry: "${planDef}". Skipping.`);
                }

                // Format: name:limit,batched,bars,intervals
                const parts = limits.split(',');
                if (parts.length !== 4) {
                    throw new Error(`Invalid limits format for plan "${name}". Expected 4 values.`);
                }

                const [limit, batched, bars, intervals] = parts;
                const maxLimit = Number(limit);
                const maxBatched = Number(batched);
                const maxBars = Number(bars);
                const allowedIntervals = intervals ? intervals.split('|').filter((s) => s.length > 0) : [];

                if (Number.isNaN(maxLimit) || Number.isNaN(maxBatched) || Number.isNaN(maxBars)) {
                    throw new Error(`Invalid numeric limits for plan "${name}".`);
                }

                plans.set(name, {
                    maxLimit,
                    maxBatched,
                    maxBars,
                    allowedIntervals,
                });

                if (!name.startsWith('tgm-')) {
                    plans.set(`tgm-${name.toUpperCase()}`, {
                        maxLimit,
                        maxBatched,
                        maxBars,
                        allowedIntervals,
                    });
                }
            });

            return plans;
        }),
    })
    .transform((data) => {
        // Load YAML config if provided
        const yamlConfig = data.dbsConfigPath ? loadDbsConfig(data.dbsConfigPath) : null;

        if (yamlConfig) {
            // Use YAML config as the authoritative source when provided
            return {
                ...data,
                clusters: yamlConfig.clusters,
                balancesDatabases: yamlConfig.balancesDatabases ?? {},
                transfersDatabases: yamlConfig.transfersDatabases ?? {},
                nftDatabases: yamlConfig.nftDatabases ?? {},
                dexDatabases: yamlConfig.dexDatabases ?? {},
                contractDatabases: yamlConfig.contractDatabases ?? {},
            };
        }

        // Fallback: no YAML config, validate env-based config
        if (Object.keys(data.balancesDatabases).length === 0 && Object.keys(data.transfersDatabases).length === 0) {
            throw new Error(
                'No database configuration found. Either provide DBS_CONFIG_PATH or set DBS_BALANCES/DBS_TRANSFERS environment variables.'
            );
        }

        // No clusters in env-based mode, use default cluster
        return {
            ...data,
            clusters: {},
        };
    })
    .transform((data) => ({
        ...data,
        evmNetworks: Object.keys({
            ...data.balancesDatabases,
            ...data.transfersDatabases,
            ...data.nftDatabases,
            ...data.dexDatabases,
            ...data.contractDatabases,
        })
            .filter((networkId) => {
                return (
                    {
                        ...data.balancesDatabases,
                        ...data.transfersDatabases,
                        ...data.nftDatabases,
                        ...data.dexDatabases,
                        ...data.contractDatabases,
                    }[networkId]?.type === 'evm'
                );
            })
            .sort(),
        svmNetworks: Object.keys({
            ...data.balancesDatabases,
            ...data.transfersDatabases,
            ...data.nftDatabases,
            ...data.dexDatabases,
            ...data.contractDatabases,
        })
            .filter((networkId) => {
                return (
                    {
                        ...data.balancesDatabases,
                        ...data.transfersDatabases,
                        ...data.nftDatabases,
                        ...data.dexDatabases,
                        ...data.contractDatabases,
                    }[networkId]?.type === 'svm'
                );
            })
            .sort(),
        tvmNetworks: Object.keys({
            ...data.transfersDatabases,
            ...data.dexDatabases,
        })
            .filter((networkId) => {
                return (
                    {
                        ...data.transfersDatabases,
                        ...data.dexDatabases,
                    }[networkId]?.type === 'tvm'
                );
            })
            .sort(),
    }))
    .transform((data) => ({
        ...data,
        networks: [...data.evmNetworks, ...data.svmNetworks, ...data.tvmNetworks],
    }))
    .parse(opts);

export { config };
