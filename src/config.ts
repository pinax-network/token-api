import "dotenv/config";
import { z } from 'zod';
import { Option, program } from "commander";
import { $ } from "bun";

import pkg from "../package.json" with { type: "json" };

// defaults
export const DEFAULT_PORT = "8000";
export const DEFAULT_HOSTNAME = "localhost";
export const DEFAULT_SSE_PORT = "8080";
export const DEFAULT_SSE_ENDPOINT = "sse";
export const DEFAULT_URL = "http://localhost:8123";
export const DEFAULT_DATABASE = "default";
export const DEFAULT_USERNAME = "default";
export const DEFAULT_PASSWORD = "";
export const DEFAULT_MCP_USERNAME = "default";
export const DEFAULT_MCP_PASSWORD = "";
export const DEFAULT_MAX_LIMIT = 10000;
export const DEFAULT_LARGE_QUERIES_ROWS_TRIGGER = 10_000_000; // 10M rows
export const DEFAULT_LARGE_QUERIES_BYTES_TRIGGER = 1_000_000_000; // 1Gb
export const DEFAULT_IDLE_TIMEOUT = 60;
export const DEFAULT_PRETTY_LOGGING = false;
export const DEFAULT_VERBOSE = false;
export const DEFAULT_SORT_BY = "DESC";
export const DEFAULT_AGE = 30;
export const DEFAULT_MAX_AGE = 180;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_NETWORK_ID = "mainnet";
export const DEFAULT_NETWORKS = DEFAULT_NETWORK_ID;
export const DEFAULT_LOW_LIQUIDITY_CHECK = 10000; // $10K USD
export const DEFAULT_DISABLE_OPENAPI_SERVERS = false;

// Token Substreams
// https://github.com/pinax-network/substreams-evm-tokens
export const DEFAULT_DB_EVM_SUFFIX = "evm-tokens@v1.9.0:db_out";
// https://github.com/pinax-network/substreams-svm-tokens
export const DEFAULT_DB_SVM_SUFFIX = "svm-tokens@v1.0.0:db_out"; // NOT YET IMPLEMENTED
// https://github.com/pinax-network/substreams-antelope-tokens
export const DEFAULT_DB_ANTELOPE_SUFFIX = "antelope-tokens@v1.0.0:db_out"; // NOT YET IMPLEMENTED

// GitHub metadata
const GIT_COMMIT = (process.env.GIT_COMMIT ?? await $`git rev-parse HEAD`.text()).replace(/\n/, "").slice(0, 7);
const GIT_DATE = (process.env.GIT_DATE ?? await $`git log -1 --format=%cd --date=short`.text()).replace(/\n/, "");
const GIT_REPOSITORY = (process.env.GIT_REPOSITORY ?? await $`git config --get remote.origin.url`.text()).replace(/git@github.com:/, "").replace(".git", "").replace(/\n/, "");
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
    .addOption(new Option("-p, --port <number>", "HTTP port on which to attach the API").env("PORT").default(DEFAULT_PORT))
    .addOption(new Option("--hostname <string>", "Server listen on HTTP hostname").env("HOSTNAME").default(DEFAULT_HOSTNAME))
    .addOption(new Option("--sse-port <number>", "HTTP port on which to attach the MCP SSE server").env("SSE_PORT").default(DEFAULT_SSE_PORT))
    .addOption(new Option("--sse-endpoint <string>", "Endpoint name for the MCP SSE server").env("SSE_ENDPOINT").default(DEFAULT_SSE_ENDPOINT))
    .addOption(new Option("--url <string>", "Database HTTP hostname").env("URL").default(DEFAULT_URL))
    .addOption(new Option("--database <string>", "The database to use inside ClickHouse").env("DATABASE").default(DEFAULT_DATABASE))
    .addOption(new Option("--username <string>", "Database user for API").env("USERNAME").default(DEFAULT_USERNAME))
    .addOption(new Option("--password <string>", "Password associated with the specified API username").env("PASSWORD").default(DEFAULT_PASSWORD))
    .addOption(new Option("--networks <string>", "Supported The Graph Network IDs").env("NETWORKS").default(DEFAULT_NETWORKS))
    .addOption(new Option("--db-evm-suffix <string>", "EVM Token Clickhouse database suffix").env("DB_EVM_SUFFIX").default(DEFAULT_DB_EVM_SUFFIX))
    .addOption(new Option("--db-svm-suffix <string>", "SVM (Solana) Token Clickhouse database suffix").env("DB_SVM_SUFFIX").default(DEFAULT_DB_SVM_SUFFIX))
    .addOption(new Option("--db-antelope-suffix <string>", "Antelope Token Clickhouse database suffix").env("DB_ANTELOPE_SUFFIX").default(DEFAULT_DB_ANTELOPE_SUFFIX))
    .addOption(new Option("--mcp-username <string>", "Database user for MCP").env("MCP_USERNAME").default(DEFAULT_MCP_USERNAME))
    .addOption(new Option("--mcp-password <string>", "Password associated with the specified MCP username").env("MCP_PASSWORD").default(DEFAULT_MCP_PASSWORD))
    .addOption(new Option("--max-limit <number>", "Maximum LIMIT queries").env("MAX_LIMIT").default(DEFAULT_MAX_LIMIT))
    .addOption(new Option("--max-rows-trigger <number>", "Queries returning rows above this treshold will be considered large queries for metrics").env("LARGE_QUERIES_ROWS_TRIGGER").default(DEFAULT_LARGE_QUERIES_ROWS_TRIGGER))
    .addOption(new Option("--max-bytes-trigger <number>", "Queries processing bytes above this treshold will be considered large queries for metrics").env("LARGE_QUERIES_BYTES_TRIGGER").default(DEFAULT_LARGE_QUERIES_BYTES_TRIGGER))
    .addOption(new Option("--idle-timeout <number>", "HTTP server request idle timeout (seconds)").env("IDLE_TIMEOUT").default(DEFAULT_IDLE_TIMEOUT))
    .addOption(new Option("--disable-openapi-servers <boolean>", "Disable OpenAPI servers (used for local testing)").choices(["true", "false"]).env("DISABLE_OPENAPI_SERVERS").default(DEFAULT_DISABLE_OPENAPI_SERVERS))
    .addOption(new Option("--pretty-logging <boolean>", "Enable pretty logging (default JSON)").choices(["true", "false"]).env("PRETTY_LOGGING").default(DEFAULT_PRETTY_LOGGING))
    .addOption(new Option("-v, --verbose <boolean>", "Enable verbose logging").choices(["true", "false"]).env("VERBOSE").default(DEFAULT_VERBOSE))
    .parse()
    .opts();

export const config = z.object({
    port: z.string(),
    hostname: z.string(),
    ssePort: z.coerce.number(),
    sseEndpoint: z.string(),
    url: z.string(),
    database: z.string(),
    username: z.string(),
    password: z.string(),
    networks: z.string().transform((networks) => networks.split(',')),
    dbEvmSuffix: z.string(),
    dbSvmSuffix: z.string(),
    dbAntelopeSuffix: z.string(),
    mcpUsername: z.string(),
    mcpPassword: z.string(),
    maxLimit: z.coerce.number(),
    maxRowsTrigger: z.coerce.number(),
    maxBytesTrigger: z.coerce.number(),
    idleTimeout: z.coerce.number(),
    // `z.coerce.boolean` doesn't parse boolean string values as expected (see https://github.com/colinhacks/zod/issues/1630)
    prettyLogging: z.coerce.string().transform((val) => val.toLowerCase() === "true"),
    disableOpenapiServers: z.coerce.string().transform((val) => val.toLowerCase() === "true"),
    verbose: z.coerce.string().transform((val) => val.toLowerCase() === "true"),
}).parse(opts);
