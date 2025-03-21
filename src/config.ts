import "dotenv/config";
import { z } from 'zod';
import { Option, program } from "commander";

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
export const DEFAULT_MAX_LIMIT = 10000;
export const DEFAULT_LARGE_QUERIES_ROWS_TRIGGER = 10_000_000; // 10M rows
export const DEFAULT_LARGE_QUERIES_BYTES_TRIGGER = 1_000_000_000; // 1Gb
export const DEFAULT_IDLE_TIMEOUT = 60;
export const DEFAULT_PRETTY_LOGGING = false;
export const DEFAULT_VERBOSE = false;
export const DEFAULT_SORT_BY = "DESC";
export const APP_NAME = pkg.name;
export const GIT_COMMIT = process.env.GIT_COMMIT || "unknown";
export const APP_VERSION = {
    version: pkg.version,
    commit: GIT_COMMIT
};
export const DEFAULT_AGE = 30;
export const DEFAULT_MAX_AGE = 180;
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_NETWORK_ID = "mainnet";
export const DEFAULT_NETWORKS = "arbitrum-one,base,bsc,mainnet"

// parse command line options
const opts = program
    .name(pkg.name)
    .version(`${APP_VERSION.version}+${APP_VERSION.commit}`)
    .description(pkg.description)
    .showHelpAfterError()
    .addOption(new Option("-p, --port <number>", "HTTP port on which to attach the API").env("PORT").default(DEFAULT_PORT))
    .addOption(new Option("--hostname <string>", "Server listen on HTTP hostname").env("HOSTNAME").default(DEFAULT_HOSTNAME))
    .addOption(new Option("--sse-port <number>", "HTTP port on which to attach the MCP SSE server").env("SSE_PORT").default(DEFAULT_SSE_PORT))
    .addOption(new Option("--sse-endpoint <string>", "Endpoint name for the MCP SSE server").env("SSE_ENDPOINT").default(DEFAULT_SSE_ENDPOINT))
    .addOption(new Option("--url <string>", "Database HTTP hostname").env("URL").default(DEFAULT_URL))
    .addOption(new Option("--database <string>", "The database to use inside ClickHouse").env("DATABASE").default(DEFAULT_DATABASE))
    .addOption(new Option("--username <string>", "Database user").env("USERNAME").default(DEFAULT_USERNAME))
    .addOption(new Option("--password <string>", "Password associated with the specified username").env("PASSWORD").default(DEFAULT_PASSWORD))
    .addOption(new Option("--max-limit <number>", "Maximum LIMIT queries").env("MAX_LIMIT").default(DEFAULT_MAX_LIMIT))
    .addOption(new Option("--max-rows-trigger <number>", "Queries returning rows above this treshold will be considered large queries for metrics").env("LARGE_QUERIES_ROWS_TRIGGER").default(DEFAULT_LARGE_QUERIES_ROWS_TRIGGER))
    .addOption(new Option("--max-bytes-trigger <number>", "Queries processing bytes above this treshold will be considered large queries for metrics").env("LARGE_QUERIES_BYTES_TRIGGER").default(DEFAULT_LARGE_QUERIES_BYTES_TRIGGER))
    .addOption(new Option("--request-idle-timeout <number>", "Bun server request idle timeout (seconds)").env("BUN_IDLE_REQUEST_TIMEOUT").default(DEFAULT_IDLE_TIMEOUT))
    .addOption(new Option("--pretty-logging <boolean>", "Enable pretty logging (default JSON)").choices(["true", "false"]).env("PRETTY_LOGGING").default(DEFAULT_PRETTY_LOGGING))
    .addOption(new Option("--networks <string>", "Supported The Graph Network IDs").env("NETWORKS").default(DEFAULT_NETWORKS))
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
    maxLimit: z.coerce.number(),
    maxRowsTrigger: z.coerce.number(),
    maxBytesTrigger: z.coerce.number(),
    requestIdleTimeout: z.coerce.number(),
    networks: z.string().transform((networks) => networks.split(',')),
    // `z.coerce.boolean` doesn't parse boolean string values as expected (see https://github.com/colinhacks/zod/issues/1630)
    prettyLogging: z.coerce.string().transform((val) => val.toLowerCase() === "true"),
    verbose: z.coerce.string().transform((val) => val.toLowerCase() === "true"),
}).parse(opts);
