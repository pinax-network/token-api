import 'zod-openapi/extend';
import { z } from "zod";
import { config, DEFAULT_AGE, DEFAULT_LIMIT, DEFAULT_MAX_AGE } from "../config.js";

// ----------------------
// Common schemas
// ----------------------
export const evmAddress = z.coerce.string().regex(new RegExp("^(0[xX])?[0-9a-fA-F]{40}$"));
export type EvmAddress = z.infer<typeof evmAddress>;
export const evmTransaction = z.coerce.string().regex(new RegExp("^(0[xX])?[0-9a-fA-F]{64}$"));
export type EvmTransaction = z.infer<typeof evmTransaction>;

export const svmAddress = z.coerce.string().regex(new RegExp("^[1-9A-HJ-NP-Za-km-z]{32,44}$"));
export type SvmAddress = z.infer<typeof evmAddress>;
export const svmTransaction = z.coerce.string().regex(new RegExp("^[1-9A-HJ-NP-Za-km-z]{87,88}$"));
export type SvmTransaction = z.infer<typeof evmTransaction>;

export const blockNumHash = z.object({
    "block_num": z.coerce.number().int(),
    "block_hash": z.coerce.string()
});
export type BlockNumHash = z.infer<typeof blockNumHash>;

export const version = z.coerce.string().regex(new RegExp("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"));
export type Version = z.infer<typeof version>;

export const commit = z.coerce.string().regex(new RegExp("^[0-9a-f]{7}$"));
export type Commit = z.infer<typeof commit>;

export const protocolSchema = z.enum(["uniswap_v2", "uniswap_v3"]).openapi({ description: "Protocol name", example: "uniswap_v3" });
export const svmProtocolSchema = z.enum(["raydium_amm_v4"]).openapi({ description: "Protocol name", example: "raydium_amm_v4" });

export const evmAddressSchema = evmAddress.toLowerCase().transform((addr) => addr.length == 40 ? `0x${addr}` : addr).pipe(z.string()).openapi({
    description: 'Filter by address'
});
export const evmTransactionSchema = evmTransaction.toLowerCase().transform((addr) => addr.length == 64 ? `0x${addr}` : addr).pipe(z.string()).openapi({ description: 'Filter by transaction' });

export const svmAddressSchema = svmAddress.pipe(z.string()).openapi({
    description: 'Filter by address'
});
export const svmTransactionSchema = svmTransaction.pipe(z.string()).openapi({ description: 'Filter by transaction signature' });

// z.enum argument type definition requires at least one element to be defined
export const EVM_networkIdSchema = z.enum([config.evmNetworks.at(0) ?? config.defaultEvmNetwork, ...config.evmNetworks.slice(1)]).openapi({ description: "The Graph Network ID for EVM networks https://thegraph.com/networks", example: config.defaultEvmNetwork });
export const SVM_networkIdSchema = z.enum([config.svmNetworks.at(0) ?? config.defaultSvmNetwork, ...config.svmNetworks.slice(1)]).openapi({ description: "The Graph Network ID for SVM networks https://thegraph.com/networks", example: config.defaultSvmNetwork });

export const ageSchema = z.coerce.number().int().min(1).max(DEFAULT_MAX_AGE).default(DEFAULT_AGE).openapi({ description: "Indicates how many days have passed since the data's creation or insertion." });
export const limitSchema = z.coerce.number().int().min(1).max(1000).default(DEFAULT_LIMIT).openapi({ description: 'The maximum number of items returned in a single request.' });
export const pageSchema = z.coerce.number().int().min(1).default(1).openapi({ description: 'The page number of the results to return.' });
export const orderDirectionSchema = z.enum(["asc", "desc"]).default('desc').openapi({ description: 'The order in which to return the results: Ascending (asc) or Descending (desc).' });
export const orderBySchemaTimestamp = z.enum(["timestamp"]).default("timestamp").openapi({ description: 'The field by which to order the results.' });
export const orderBySchemaValue = z.enum(["value"]).default("value").openapi({ description: 'The field by which to order the results.' });
export const intervalSchema = z.enum(['1h', '4h', '1d', '1w']).default('1h').openapi({ description: 'The interval for which to aggregate price data (hourly, 4-hours, daily or weekly).' });
export const timestampSchema = z.coerce.number().min(0, 'Timestamp must be in seconds').transform((t) => t * 1000).openapi({ description: 'UNIX timestamp in seconds.' });

// NFT schemas
export const tokenIdSchema = z.coerce.string()
    .regex(/^(\d+|)$/, { message: "Must be a valid number or empty string" })
    .openapi({ description: 'NFT token ID' });
export const tokenStandardSchema = z.enum(['', 'ERC721', 'ERC1155']);

// Used for examples
export const Vitalik = evmAddressSchema.openapi({ example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' }); // Vitalik Buterin wallet address
export const WETH = evmAddressSchema.openapi({ description: 'Filter by contract address', example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' }); // WETH (Wrapped Ethereum)
export const GRT = evmAddressSchema.openapi({ description: 'Filter by contract address', example: '0xc944e90c64b2c07662a292be6244bdf05cda44a7' }); // GRT
export const USDC_WETH = evmAddressSchema.openapi({ description: 'Filter by contract address', example: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640' }); // UDSC/WETH (Uniswap V3)
export const PudgyPenguins = evmAddressSchema.openapi({ description: 'Filter by NFT contract address', example: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8' }); // Pudgy Penguins
export const PudgyPenguinsItem = tokenIdSchema.openapi({ description: 'NFT token ID', example: '5712' });

// Solana examples
export const filterByAmm = svmAddressSchema.openapi({ description: 'Filter by amm address' });
export const filterByAmmPool = svmAddressSchema.openapi({ description: 'Filter by amm pool address' });
export const filterByProgramId = svmAddressSchema.openapi({ description: 'Filter by program ID' });
export const filterByUser = svmAddressSchema.openapi({ description: 'Filter by user address' });
export const filterByMint = svmAddressSchema.openapi({ description: 'Filter by mint address' });
export const filterByTokenAccount = svmAddressSchema.openapi({ description: 'Filter by token account address' });
export const filterByOwner = svmAddressSchema.openapi({ description: 'Filter by owner address' });

export const RaydiumWSOLMarketTokenAccount = filterByTokenAccount.openapi({ example: '4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A' });
export const RaydiumWSOLMarketOwner = filterByOwner.openapi({ example: '3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv' });

export const RaydiumV4 = filterByProgramId.openapi({ example: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' });
export const USDC_WSOL = filterByAmmPool.openapi({ example: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2' });
export const WSOL = filterByMint.openapi({ example: 'So11111111111111111111111111111111111111112' });
export const SolanaProgramIds = z.enum(["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB", "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"]).openapi({ description: 'Filter by program ID' });
export const SolanaSPLTokenProgramIds = z.enum(["TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"]).openapi({ description: 'Filter by program ID' });
export const PumpFunAmmProgramId = SolanaProgramIds.openapi({ example: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA' });

export const tokenSchema = z.object({
    address: evmAddressSchema,
    symbol: z.string(),
    decimals: z.number(),
});

export const mintSchema = z.object({
    address: evmAddressSchema,
    // symbol: z.string(),
    decimals: z.number(),
});

// ----------------------
// API Query Params
// ----------------------
export const paginationQuery = z.object({
    "limit": limitSchema.optional(),
    "page": pageSchema.optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

export const statisticsSchema = z.object({
    elapsed: z.optional(z.number()),
    rows_read: z.optional(z.number()),
    bytes_read: z.optional(z.number()),
});

export const paginationSchema = z.object({
    previous_page: z.coerce.number().int().min(1),
    current_page: z.coerce.number().int().min(1),
    next_page: z.coerce.number().int().min(1),
    total_pages: z.coerce.number().int().min(1),
}).refine(({ previous_page, current_page, next_page, total_pages }) =>
    previous_page <= current_page
    && current_page <= next_page
    && next_page <= total_pages
);
export type PaginationSchema = z.infer<typeof paginationSchema>;

// ----------------------
// API Responses
// ----------------------
export const apiErrorResponse = z.object({
    "status": z.union([z.literal(500), z.literal(502), z.literal(504), z.literal(400), z.literal(401), z.literal(403), z.literal(404), z.literal(405)]),
    "code": z.enum(["bad_database_response", "connection_refused", "authentication_failed", "bad_header", "missing_required_header", "bad_query_input", "database_timeout", "forbidden", "internal_server_error", "method_not_allowed", "route_not_found", "unauthorized", "not_found_data"]),
    "message": z.coerce.string()
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponse>;

export const apiUsageResponse = z.object({
    data: z.array(z.any()),
    statistics: z.optional(statisticsSchema),
    pagination: paginationSchema,
    results: z.optional(z.number()),
    total_results: z.optional(z.number()),
    request_time: z.date(),
    duration_ms: z.number()
});
export type ApiUsageResponse = z.infer<typeof apiUsageResponse>;
