import { z } from 'zod';
import { config, DEFAULT_LIMIT } from '../config.js';
import {
    EVM_ADDRESS_VITALIK_EXAMPLE,
    EVM_CONTRACT_WETH_EXAMPLE,
    EVM_FACTORY_UNISWAP_V2_EXAMPLE,
    EVM_POOL_USDC_WETH_EXAMPLE,
    EVM_TOKEN_ID_PUDGY_PENGUIN_EXAMPLE,
    EVM_TRANSACTION_SWAP_EXAMPLE,
    SVM_ADDRESS_OWNER_EXAMPLE,
    SVM_ADDRESS_WSOL_EXAMPLE,
    SVM_AMM_POOL_PUMP_EXAMPLE,
    SVM_AMM_RAYDIUM_V4_EXAMPLE,
    SVM_AUTHORITY_USER_EXAMPLE,
    SVM_MINT_PUMP_EXAMPLE,
    SVM_TOKEN_ACCOUNT_PUMP_EXAMPLE,
    SVM_TRANSACTION_SWAP_EXAMPLE,
    TVM_ADDRESS_JUSTIN_SUN_EXAMPLE,
    TVM_CONTRACT_USDT_EXAMPLE,
    TVM_FACTORY_SUNSWAP_EXAMPLE,
    TVM_POOL_USDT_WTRX_EXAMPLE,
    TVM_TRANSACTION_TRANSFER_EXAMPLE,
} from './examples.js';

// ----------------------
// Base Validation Schemas (composable primitives)
// ----------------------

export const booleanFromString = z.preprocess((val, ctx) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (typeof val === 'boolean') return val;

    // Invalid value
    ctx.addIssue({
        code: 'custom',
        message: 'Must be `true` or `false`',
    });

    return z.NEVER;
}, z.boolean());

export const evmAddress = z.coerce
    .string()
    .refine((val) => /^(0[xX])?[0-9a-fA-F]{40}$/.test(val), 'Invalid EVM address')
    .transform((addr) => addr.toLowerCase())
    .transform((addr) => (addr.length === 40 ? `0x${addr}` : addr))
    .pipe(z.string())
    .meta({ type: 'string' });

export const evmTransaction = z.coerce
    .string()
    .refine((val) => /^(0[xX])?[0-9a-fA-F]{64}$/.test(val), 'Invalid EVM transaction')
    .transform((addr) => addr.toLowerCase())
    .transform((addr) => (addr.length === 64 ? `0x${addr}` : addr))
    .pipe(z.string())
    .meta({ type: 'string' });

export const svmAddress = z.coerce
    .string()
    .refine((val) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val), 'Invalid SVM address')
    .pipe(z.string())
    .meta({ type: 'string' });

export const svmTransaction = z.coerce
    .string()
    .refine((val) => /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(val), 'Invalid SVM transaction')
    .pipe(z.string())
    .meta({ type: 'string' });

export const tvmAddress = z.coerce
    .string()
    .refine((val) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(val), 'Invalid TVM address')
    .pipe(z.string())
    .meta({ type: 'string' });

export const tvmTransaction = z.coerce
    .string()
    .refine((val) => /^[0-9a-fA-F]{64}$/.test(val), 'Invalid TVM transaction hash')
    .transform((hash) => hash.toLowerCase())
    .pipe(z.string())
    .meta({ type: 'string' });

export const version = z.coerce.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
export const commit = z.coerce.string().regex(/^[0-9a-f]{7}$/);

// Type exports
export type EvmAddress = z.infer<typeof evmAddress>;
export type EvmTransaction = z.infer<typeof evmTransaction>;
export type SvmAddress = z.infer<typeof svmAddress>;
export type SvmTransaction = z.infer<typeof svmTransaction>;
export type TvmAddress = z.infer<typeof tvmAddress>;
export type TvmTransaction = z.infer<typeof tvmTransaction>;
export type Version = z.infer<typeof version>;
export type Commit = z.infer<typeof commit>;

// ----------------------
// Network Schemas
// ----------------------

export const evmNetworkIdSchema = z
    .enum([config.evmNetworks.at(0) ?? config.defaultEvmNetwork, ...config.evmNetworks.slice(1)])
    .meta({
        description: 'The Graph Network ID for EVM networks https://thegraph.com/networks',
        example: config.defaultEvmNetwork,
    });

export const svmNetworkIdSchema = z
    .enum([config.svmNetworks.at(0) ?? config.defaultSvmNetwork, ...config.svmNetworks.slice(1)])
    .meta({
        description: 'The Graph Network ID for SVM networks https://thegraph.com/networks',
        example: config.defaultSvmNetwork,
    });

export const tvmNetworkIdSchema = z
    .enum([config.tvmNetworks.at(0) ?? config.defaultTvmNetwork, ...config.tvmNetworks.slice(1)])
    .meta({
        description: 'The Graph Network ID for TVM networks https://thegraph.com/networks',
        example: config.defaultTvmNetwork,
    });

// ----------------------
// Protocol Schemas
// ----------------------

export const evmProtocolSchema = z
    .enum(['uniswap_v2', 'uniswap_v3', 'uniswap_v4'])
    .meta({ description: 'Protocol name', example: 'uniswap_v3' });

export const svmProtocolSchema = z
    .enum(['raydium_amm_v4'])
    .meta({ description: 'Protocol name', example: 'raydium_amm_v4' });

export const tvmProtocolSchema = z
    .enum(['justswap', 'sunswap', 'sunpump'])
    .meta({ description: 'Protocol name', example: 'sunswap' });

// ----------------------
// Common Query Parameter Schemas
// ----------------------

export const limitSchema = z.coerce.number().int().min(1).max(config.maxLimit).default(DEFAULT_LIMIT).optional().meta({
    description: 'Number of items* returned in a single request.<br>*Plan restricted.',
});

export const pageSchema = z.coerce
    .number()
    .int()
    .min(1)
    .max(Math.floor(767465558638592 / config.maxLimit))
    .default(1)
    .optional()
    .meta({ description: 'Page number to fetch.<br>Empty `data` array signifies end of results.' });

const intervals = ['1h', '4h', '1d', '1w'] as const;
export const intervalSchema = z
    .enum(intervals)
    .transform((interval: string) => {
        switch (interval) {
            case '1h':
                return 60;
            case '4h':
                return 240;
            case '1d':
                return 1440;
            case '1w':
                return 10080;
            default:
                return 1440;
        }
    })
    .meta({
        type: 'string',
        enum: intervals,
        default: '1d',
        description:
            'The interval* for which to aggregate price data (hourly, 4-hours, daily or weekly).<br>*Plan restricted.',
    });

export const timestampSchema = z
    .string()
    .transform((input, ctx) => {
        // Try to parse as a number first (UNIX timestamp)
        const asNumber = Number(input);
        if (!Number.isNaN(asNumber) && input.trim() !== '') {
            // It's a valid number, treat as UNIX timestamp
            if (asNumber < 0 || asNumber > Number.MAX_SAFE_INTEGER) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Timestamp must be a valid UNIX timestamp in seconds',
                });
                return z.NEVER;
            }

            const date = new Date(asNumber * 1000);
            if (Number.isNaN(date.getTime())) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'Invalid timestamp',
                });
                return z.NEVER;
            }

            return asNumber;
        }

        // Try to parse as a date string
        const date = new Date(input);
        if (Number.isNaN(date.getTime())) {
            ctx.addIssue({
                code: 'custom',
                message: 'Invalid date string',
            });
            return z.NEVER;
        }

        const timestamp = Math.floor(date.getTime() / 1000);

        if (timestamp < 0 || timestamp > Number.MAX_SAFE_INTEGER) {
            ctx.addIssue({
                code: 'custom',
                message: 'Timestamp must be a valid UNIX timestamp in seconds',
            });
            return z.NEVER;
        }

        return timestamp;
    })
    .meta({
        type: 'string',
        description: 'UNIX timestamp in seconds or date string (e.g. "2025-01-01T00:00:00Z", "2025-01-01", ...).',
    });

export const blockNumberSchema = z.coerce.number().int().min(0).meta({ description: 'Filter by block number' });
export const includeNullBalancesSchema = booleanFromString.meta({
    description: 'Include zero/null balances in results',
});

// ----------------------
// NFT Schemas
// ----------------------

export const nftTokenIdSchema = z.coerce
    .string()
    .refine((val) => /^(\d+|)$/.test(val), 'Invalid Token ID')
    .meta({ description: 'Token ID', type: 'string', example: EVM_TOKEN_ID_PUDGY_PENGUIN_EXAMPLE });

export const nftTokenStandardSchema = z
    .enum(['ERC721', 'ERC1155'])
    .meta({ description: 'Token standard', example: 'ERC721' });

export const nftTransferTypeSchema = z
    .enum(['BURN', 'MINT', 'TRANSFER'])
    .meta({ description: 'Transfer category', example: 'TRANSFER' });

// ----------------------
// Composable Field Schemas (EVM)
// ----------------------

// Address-based fields (all use evmAddress as base)
export const evmContractSchema = evmAddress.meta({
    description: 'Filter by contract address',
    example: EVM_CONTRACT_WETH_EXAMPLE,
});

export const evmAddressSchema = evmAddress.meta({
    description: 'Filter by address',
    example: EVM_ADDRESS_VITALIK_EXAMPLE,
});

export const evmPoolSchema = z
    .union([evmAddress, evmTransaction])
    .transform((addr) => addr.toLowerCase())
    .transform((addr) => (addr.length === 40 || addr.length === 64 ? `0x${addr}` : addr))
    .meta({
        description: 'Filter by pool address',
        type: 'string',
        example: EVM_POOL_USDC_WETH_EXAMPLE,
    });

export const evmFactorySchema = evmAddress.meta({
    description: 'Filter by factory address',
    example: EVM_FACTORY_UNISWAP_V2_EXAMPLE,
});

export const evmTransactionSchema = evmTransaction.meta({
    description: 'Filter by transaction hash',
    example: EVM_TRANSACTION_SWAP_EXAMPLE,
});

// ----------------------
// Composable Field Schemas (SVM)
// ----------------------

export const svmAddressSchema = svmAddress.meta({
    description: 'Filter by address',
    example: SVM_ADDRESS_WSOL_EXAMPLE,
});

export const svmOwnerSchema = svmAddress.meta({
    description: 'Filter by owner address',
    example: SVM_ADDRESS_OWNER_EXAMPLE,
});

export const svmTokenAccountSchema = svmAddress.meta({
    description: 'Filter by token account address',
    example: SVM_TOKEN_ACCOUNT_PUMP_EXAMPLE,
});

export const svmMintSchema = svmAddress.meta({
    description: 'Filter by mint address',
    example: SVM_MINT_PUMP_EXAMPLE,
});

export const svmAuthoritySchema = svmAddress.meta({
    description: 'Filter by authority address',
    example: SVM_AUTHORITY_USER_EXAMPLE,
});

export const svmAmmSchema = svmAddress.meta({
    description: 'Filter by AMM address',
    example: SVM_AMM_RAYDIUM_V4_EXAMPLE,
});

export const svmAmmPoolSchema = svmAddress.meta({
    description: 'Filter by AMM pool address',
    example: SVM_AMM_POOL_PUMP_EXAMPLE,
});

export const svmTransactionSchema = svmTransaction.meta({
    description: 'Filter by transaction signature',
    example: SVM_TRANSACTION_SWAP_EXAMPLE,
});

export const svmProgramIdSchema = z
    .enum([
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
        'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
        'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    ])
    .meta({ description: 'Filter by program ID', example: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' });

export const svmSPLTokenProgramIdSchema = z
    .enum([
        '11111111111111111111111111111111',
        'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    ])
    .meta({ description: 'Filter by SPL token program ID', example: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' });

export const svmMetadataSchema = z.string().nullable().optional();

// ----------------------
// Composable Field Schemas (TVM)
// ----------------------

// Address-based fields (all use evmAddress as base)
export const tvmContractSchema = tvmAddress.meta({
    description: 'Filter by contract address',
    example: TVM_CONTRACT_USDT_EXAMPLE,
});

export const tvmAddressSchema = tvmAddress.meta({
    description: 'Filter by address',
    example: TVM_ADDRESS_JUSTIN_SUN_EXAMPLE,
});

export const tvmPoolSchema = tvmAddress.meta({
    description: 'Filter by pool address',
    type: 'string',
    example: TVM_POOL_USDT_WTRX_EXAMPLE,
});

export const tvmFactorySchema = tvmAddress.meta({
    description: 'Filter by factory address',
    example: TVM_FACTORY_SUNSWAP_EXAMPLE,
});

export const tvmTransactionSchema = tvmTransaction.meta({
    description: 'Filter by transaction hash',
    example: TVM_TRANSACTION_TRANSFER_EXAMPLE,
});

// ----------------------
// Response Schemas
// ----------------------

export const evmTokenResponseSchema = z.object({
    address: evmAddressSchema.nullable(),
    symbol: z.string().nullable(),
    decimals: z.number().nullable(),
});

export const svmMintResponseSchema = z.object({
    address: svmAddressSchema,
    decimals: z.number(),
});

export const tvmTokenResponseSchema = z.object({
    address: tvmAddressSchema,
    symbol: z.string(),
    name: z.string(),
    decimals: z.number(),
});

export const paginationQuerySchema = z.object({
    limit: limitSchema,
    page: pageSchema,
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const statisticsResponseSchema = z.object({
    elapsed: z.number().optional(),
    rows_read: z.number().optional(),
    bytes_read: z.number().optional(),
});

export const paginationResponseSchema = z.object({
    previous_page: z.coerce.number().int().min(1),
    current_page: z.coerce.number().int().min(1),
});

export type PaginationSchema = z.infer<typeof paginationResponseSchema>;

export const apiUsageResponseSchema = z.object({
    data: z.array(z.any()),
    statistics: statisticsResponseSchema,
    pagination: paginationResponseSchema,
    results: z.number(),
    request_time: z.date(),
    duration_ms: z.number(),
});

export type ApiUsageResponse = z.infer<typeof apiUsageResponseSchema>;

// ----------------------
// Error Response Schemas
// ----------------------

const baseMessage = z.coerce.string();

const clientErrorCodes = [
    'authentication_failed',
    'bad_header',
    'missing_required_header',
    'bad_query_input',
    'forbidden',
    'method_not_allowed',
    'route_not_found',
    'unauthorized',
    'not_found_data',
] as const;

const serverErrorCodes = [
    'bad_database_response',
    'connection_refused',
    'database_timeout',
    'internal_server_error',
] as const;

export const clientErrorResponseSchema = z.object({
    status: z.union([z.literal(400), z.literal(401), z.literal(403), z.literal(404), z.literal(405)]),
    code: z.enum(clientErrorCodes),
    message: baseMessage,
});

export type ClientErrorResponse = z.infer<typeof clientErrorResponseSchema>;

export const serverErrorResponseSchema = z.object({
    status: z.union([z.literal(500), z.literal(502), z.literal(504)]),
    code: z.enum(serverErrorCodes),
    message: baseMessage,
});

export type ServerErrorResponse = z.infer<typeof serverErrorResponseSchema>;

export const apiErrorResponseSchema = z.union([clientErrorResponseSchema, serverErrorResponseSchema]);
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

// ----------------------
// Helper function for query schema
// ----------------------

/**
 * Configuration object for defining a field in a query schema.
 *
 * @property schema - The base Zod schema to validate the field
 * @property batched - If true, accepts single value, comma-separated string, or array. Output is always an array.
 * @property default - Default value set at schema output (short-circuits parsing). Field becomes optional.
 * @property prefault - Pre-parse default value set at schema input (does not short-circuit). Field becomes optional.
 * @property separator - Separator for parsing comma-separated strings in batched fields (default: ',')
 * @property meta - Additional metadata to attach to the schema (e.g., description, custom fields)
 *
 * @note Only one of `default` or `prefault` can be set. This is enforced at the type level.
 */
type FieldConfig = {
    schema: z.ZodTypeAny;
    batched?: boolean;
    separator?: string;
    meta?: Record<string, unknown>;
} & (
    | { default: unknown; prefault?: never }
    | { prefault: unknown; default?: never }
    | { default?: never; prefault?: never }
);

/**
 * Infers the processed Zod schema type based on field configuration.
 *
 * Type inference rules:
 * - batched + no default/prefault = z.ZodType<Array<T>> (required array)
 * - batched + has default/prefault = z.ZodDefault<z.ZodType<Array<T>>> (optional array)
 * - not batched + no default/prefault = original schema (required single value)
 * - not batched + has default/prefault = z.ZodDefault<schema> (optional single value)
 *
 * @template T - The field configuration to process
 */
type InferProcessedSchema<T extends FieldConfig> = T['batched'] extends true
    ? T['default'] extends undefined
        ? T['prefault'] extends undefined
            ? z.ZodType<Array<z.infer<T['schema']>>>
            : z.ZodDefault<z.ZodType<Array<z.infer<T['schema']>>>>
        : z.ZodDefault<z.ZodType<Array<z.infer<T['schema']>>>>
    : T['default'] extends undefined
      ? T['prefault'] extends undefined
          ? T['schema']
          : z.ZodDefault<T['schema']>
      : z.ZodDefault<T['schema']>;

/**
 * Maps field configurations to their processed Zod schema types.
 *
 * Transforms a record of FieldConfig objects into a record of processed
 * Zod schemas that can be used in z.object().
 *
 * @template T - Record mapping field names to their configurations
 */
type ProcessedFields<T extends Record<string, FieldConfig>> = {
    [K in keyof T]: InferProcessedSchema<T[K]>;
};

// Overload functions to infer right type if pagination is included in the output schema or not
export function createQuerySchema<T extends Record<string, FieldConfig>>(
    definitions: T,
    include_pagination: false
): z.ZodObject<ProcessedFields<T>>;
export function createQuerySchema<T extends Record<string, FieldConfig>>(
    definitions: T,
    include_pagination?: true
): z.ZodObject<ProcessedFields<T> & typeof paginationQuerySchema.shape>;

/**
 * Creates a Zod object schema with automatic field name injection and batching support.
 *
 * This helper function processes field definitions and automatically:
 * - Injects field names into validation error messages
 * - Marks fields as required (no default/prefault) or optional (has default/prefault)
 * - Enables batched input (single value, comma-separated string, or array)
 * - Provides consistent error messages for missing required fields
 *
 * @param definitions - Object mapping field names to config objects with:
 *   - `schema`: The Zod schema to use
 *   - `batched`: Optional boolean, enables array/comma-separated input (default: false)
 *   - `default`: Optional default value at output (short-circuits parsing), makes field optional
 *   - `prefault`: Optional default value at input (does not short-circuit), makes field optional
 *   - `separator`: Optional string separator for batched fields (default: ',')
 *   - `meta`: Optional metadata object to attach to the schema (e.g., { description: '...', customField: '...' })
 * @param include_pagination - Choose to include `limit` and `page` to the query parameters
 *
 * @returns Zod object schema for query parameters
 *
 * @example
 * ```ts
 * const querySchema = createQuerySchema({
 *   network: {
 *     schema: svmNetworkIdSchema,
 *     meta: { description: 'The blockchain network to query' }
 *   },
 *   owner: {
 *     schema: svmOwnerSchema,
 *     batched: true,
 *     meta: { description: 'Owner address(es)', customField: 'value' }
 *   },
 *   // Using default (output-level, short-circuits)
 *   mint: { schema: svmMintSchema, batched: true, default: [''] },
 *   // Using prefault (input-level, goes through parsing)
 *   program_id: { schema: svmProgramIdSchema.trim(), prefault: '  default  ' },
 * });
 * ```
 */
export function createQuerySchema<T extends Record<string, FieldConfig>>(
    definitions: T,
    include_pagination: boolean = true
) {
    const querySchema = z.object(
        Object.fromEntries(
            Object.entries(definitions).map(([fieldName, config]) => {
                const {
                    schema,
                    batched = false,
                    default: defaultValue,
                    prefault: prefaultValue,
                    separator = ',',
                    meta,
                } = config;

                let resultSchema = schema;

                // Apply batching if requested
                if (batched) {
                    resultSchema = z
                        .union([
                            schema,
                            z.string().transform((str, ctx) => {
                                const items = str.split(separator).map((item) => item.trim());
                                const parsed: z.infer<typeof schema>[] = [];

                                for (const item of items) {
                                    const result = schema.safeParse(item);
                                    if (!result.success) {
                                        // Add the error to the current parsing context
                                        for (const issue of result.error.issues) {
                                            ctx.addIssue({
                                                ...issue,
                                                message: `Invalid value in ${fieldName}: ${issue.message}`,
                                            });
                                        }
                                        return z.NEVER;
                                    }
                                    parsed.push(result.data);
                                }

                                return parsed;
                            }),
                            z.array(schema),
                        ])
                        .transform((value) => {
                            return Array.isArray(value) ? value : [value];
                        })
                        .meta({
                            ...schema.meta(),
                            description: `${schema.description}<br>Single value or array of values* (separate multiple values with \`${separator}\`)<br>*Plan restricted.`,
                        });
                }

                // If no default or prefault, make it required with proper error message
                if (defaultValue === undefined && prefaultValue === undefined) {
                    resultSchema = z
                        .preprocess((val, ctx) => {
                            if (val === undefined || val === '') {
                                ctx.addIssue({
                                    code: 'invalid_type',
                                    expected: 'string',
                                    received: typeof val,
                                    message: `${fieldName} is required`,
                                });
                                return z.NEVER;
                            }

                            // Check if multiple values provided for non-batched field
                            if (!batched && Array.isArray(val)) {
                                ctx.addIssue({
                                    code: 'custom',
                                    message: `multiple values are not supported on this endpoint. Please provide only a single value.`,
                                });
                                return z.NEVER;
                            }

                            return val;
                        }, resultSchema)
                        .meta({ ...resultSchema.meta() });
                } else if (defaultValue !== undefined) {
                    // Apply default (output-level) if provided - takes precedence over prefault
                    resultSchema = resultSchema
                        .default(batched ? [defaultValue] : defaultValue)
                        .optional()
                        .meta({ ...resultSchema.meta(), default: defaultValue });
                } else if (prefaultValue !== undefined) {
                    // Apply prefault (input-level) - value goes through parsing
                    resultSchema = resultSchema
                        .prefault(prefaultValue)
                        .optional()
                        .meta({ ...resultSchema.meta(), default: prefaultValue });
                }

                // Apply custom metadata if provided
                if (meta) resultSchema = resultSchema.meta({ ...resultSchema.meta(), ...meta });

                const description = resultSchema.meta()?.description;
                // Hard-limit on OpenAPI schema description length for GPT agents
                if (description && description.length >= 300)
                    throw new Error(`'${fieldName}' description field has more than 300 characters.`);

                return [fieldName, resultSchema];
            })
        )
    );

    if (include_pagination)
        return querySchema.extend(paginationQuerySchema.shape) as z.ZodObject<
            ProcessedFields<T> & typeof paginationQuerySchema.shape
        >;
    else return querySchema as z.ZodObject<ProcessedFields<T>>;
}
