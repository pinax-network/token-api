import 'dotenv/config';
import { $ } from 'bun';
import { Option, program } from 'commander';
import { z } from 'zod';

import pkg from '../package.json' with { type: 'json' };

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
export const DEFAULT_AGE = 30;
export const DEFAULT_MAX_AGE = 180;
export const DEFAULT_OHLC_QUANTILE = 0.02;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_DEFAULT_EVM_NETWORK = 'mainnet';
export const DEFAULT_DEFAULT_SVM_NETWORK = 'solana';
export const DEFAULT_LOW_LIQUIDITY_CHECK = 10000; // $10K USD
export const DEFAULT_DISABLE_OPENAPI_SERVERS = false;
export const DEFAULT_SKIP_NETWORKS_VALIDATION = false;
export const DEFAULT_REDIS_URL = 'redis://localhost:6379';

export const DEFAULT_DBS_TOKEN = 'mainnet:evm-tokens@v1.16.0';
export const DEFAULT_DBS_NFT = 'mainnet:evm-nft-tokens@v0.5.1';
export const DEFAULT_DBS_UNISWAP = 'mainnet:evm-uniswaps@v0.1.5';
export const DEFAULT_DBS_CONTRACT = 'mainnet:evm-contracts@v0.3.0';

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
export const MAX_EXECUTION_TIME = 10;

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
        new Option('--token-databases <string>', 'Token Clickhouse databases')
            .env('DBS_TOKEN')
            .default(DEFAULT_DBS_TOKEN)
    )
    .addOption(
        new Option('--nft-databases <string>', 'NFT Clickhouse databases').env('DBS_NFT').default(DEFAULT_DBS_NFT)
    )
    .addOption(
        new Option('--uniswap-databases <string>', 'Uniswap Clickhouse databases')
            .env('DBS_UNISWAP')
            .default(DEFAULT_DBS_UNISWAP)
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
    .addOption(
        new Option('--redis-url <string>', 'Redis connection URL')
            .env('REDIS_URL')
            .default(DEFAULT_REDIS_URL)
    )
    .parse()
    .opts();

function parseDatabases(dbs: string): Record<string, { database: string; type: 'svm' | 'evm' }> {
    return Object.assign(
        {},
        ...dbs
            .split(';')
            .map((db) => {
                if (!db.includes(':')) {
                    console.warn(`Malformed database entry: "${db}". Skipping.`);
                    return null;
                }
                const [network_id, ...rest] = db.split(':');
                const db_suffix = rest.join(':');

                if (network_id && db_suffix)
                    return {
                        [network_id]: {
                            database: `${network_id}:${db_suffix}`,
                            type: network_id === 'solana' ? 'svm' : 'evm', // TODO: Get type from registry
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
        tokenDatabases: z.string().min(1, 'Token databases configuration cannot be empty').transform(parseDatabases),
        nftDatabases: z.string().min(1, 'NFT databases configuration cannot be empty').transform(parseDatabases),
        uniswapDatabases: z
            .string()
            .min(1, 'Uniswap databases configuration cannot be empty')
            .transform(parseDatabases),
        contractDatabases: z
            .string()
            .min(1, 'Contract databases configuration cannot be empty')
            .transform(parseDatabases),
        ohlcQuantile: z.coerce.number().positive('OHLC quantile must be positive'),
        maxLimit: z.coerce.number().positive('Max limit must be positive'),
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
    })
    .transform((data) => ({
        ...data,
        evmNetworks: Object.keys({
            ...data.tokenDatabases,
            ...data.nftDatabases,
            ...data.uniswapDatabases,
            ...data.contractDatabases,
        })
            .filter((networkId) => {
                return (
                    {
                        ...data.tokenDatabases,
                        ...data.nftDatabases,
                        ...data.uniswapDatabases,
                        ...data.contractDatabases,
                    }[networkId]?.type === 'evm'
                );
            })
            .sort(),
        svmNetworks: Object.keys({
            ...data.tokenDatabases,
            ...data.nftDatabases,
            ...data.uniswapDatabases,
            ...data.contractDatabases,
        })
            .filter((networkId) => {
                return (
                    {
                        ...data.tokenDatabases,
                        ...data.nftDatabases,
                        ...data.uniswapDatabases,
                        ...data.contractDatabases,
                    }[networkId]?.type === 'svm'
                );
            })
            .sort(),
    }))
    .transform((data) => ({
        ...data,
        networks: [...data.evmNetworks, ...data.svmNetworks],
    }))
    .parse(opts);

export { config };
