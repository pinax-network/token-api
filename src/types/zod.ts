import { z } from 'zod';
import { config, DEFAULT_LIMIT } from '../config.js';

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

export const version = z.coerce.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
export const commit = z.coerce.string().regex(/^[0-9a-f]{7}$/);

// Type exports
export type EvmAddress = z.infer<typeof evmAddress>;
export type EvmTransaction = z.infer<typeof evmTransaction>;
export type SvmAddress = z.infer<typeof svmAddress>;
export type SvmTransaction = z.infer<typeof svmTransaction>;
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

// ----------------------
// Protocol Schemas
// ----------------------

export const evmProtocolSchema = z
    .enum(['uniswap_v2', 'uniswap_v3', 'uniswap_v4'])
    .meta({ description: 'Protocol name', example: 'uniswap_v3' });

export const svmProtocolSchema = z
    .enum(['raydium_amm_v4'])
    .meta({ description: 'Protocol name', example: 'raydium_amm_v4' });

// ----------------------
// Common Query Parameter Schemas (with defaults for SQL)
// ----------------------

export const limitSchema = z.coerce.number().int().min(1).max(config.maxLimit).default(DEFAULT_LIMIT).meta({
    description: '[plan restricted] The maximum number of items returned in a single request.',
});

export const pageSchema = z.coerce
    .number()
    .int()
    .min(1)
    .max(Math.floor(767465558638592 / config.maxLimit))
    .default(1)
    .meta({ description: 'The page number of the results to return.' });

export const intervalSchema = z
    .enum(['1h', '4h', '1d', '1w'])
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
        enum: ['1h', '4h', '1d', '1w'],
        default: '1d',
        description: 'The interval for which to aggregate price data (hourly, 4-hours, daily or weekly).',
    });

export const timestampSchema = z
    .union([
        z.coerce.number().positive().meta({
            description: 'UNIX timestamp in seconds.',
        }),
        z
            .string()
            .transform((dateString, ctx) => {
                const date = new Date(dateString);
                if (Number.isNaN(date.getTime())) {
                    ctx.addIssue({
                        code: 'custom',
                        message: 'Invalid date string',
                    });
                    return z.NEVER;
                }
                return Math.floor(date.getTime() / 1000);
            })
            .meta({
                type: 'string',
                description: 'Date string (e.g. "2025-01-01T00:00:00Z", "January 1st 2025", ...).',
            }),
    ])
    .refine((timestamp) => timestamp >= 0 && timestamp <= Number.MAX_SAFE_INTEGER, {
        message: 'Timestamp must be a valid UNIX timestamp in seconds',
    })
    .refine(
        (timestamp) => {
            const date = new Date(timestamp * 1000);
            return !Number.isNaN(date.getTime());
        },
        { message: 'Invalid timestamp' }
    )
    .meta({
        description: 'UNIX timestamp in seconds or date string.',
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
    .meta({ description: 'Token ID', type: 'string' });

export const nftTokenStandardSchema = z.enum(['ERC721', 'ERC1155']).meta({ description: 'Token standard' });

// ----------------------
// Composable Field Schemas (EVM)
// ----------------------

// Address-based fields (all use evmAddress as base)
export const evmContractSchema = evmAddress.meta({
    description: 'Filter by contract address',
});

export const evmAddressSchema = evmAddress.meta({
    description: 'Filter by address',
});

export const evmPoolSchema = z
    .union([evmAddress, evmTransaction])
    .transform((addr) => addr.toLowerCase())
    .transform((addr) => (addr.length === 40 || addr.length === 64 ? `0x${addr}` : addr))
    .meta({
        description: 'Filter by pool address',
        type: 'string',
    });

export const evmFactorySchema = evmAddress.meta({
    description: 'Filter by factory address',
});

export const evmTransactionSchema = evmTransaction.meta({
    description: 'Filter by transaction hash',
});

// ----------------------
// Composable Field Schemas (SVM)
// ----------------------

export const svmAddressSchema = svmAddress.meta({
    description: 'Filter by address',
});

export const svmOwnerSchema = svmAddress.meta({
    description: 'Filter by owner address',
});

export const svmTokenAccountSchema = svmAddress.meta({
    description: 'Filter by token account address',
});

export const svmMintSchema = svmAddress.meta({
    description: 'Filter by mint address',
});

export const svmAuthoritySchema = svmAddress.meta({
    description: 'Filter by authority address',
});

export const svmAmmSchema = svmAddress.meta({
    description: 'Filter by AMM address',
});

export const svmAmmPoolSchema = svmAddress.meta({
    description: 'Filter by AMM pool address',
});

export const svmTransactionSchema = svmTransaction.meta({
    description: 'Filter by transaction signature',
});

export const svmProgramIdSchema = z
    .enum([
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
        'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
        'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    ])
    .meta({ description: 'Filter by program ID' });

export const svmSPLTokenProgramIdSchema = z
    .enum(['TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'])
    .meta({ description: 'Filter by SPL token program ID' });

export const svmMetadataSchema = z.string().nullable().optional();

// ----------------------
// Examples (for documentation)
// ----------------------

// EVM Examples
export const VitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
export const WETHContract = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
export const GRTContract = '0xc944e90c64b2c07662a292be6244bdf05cda44a7';
export const USDC_WETH_Pool = '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640';
export const PudgyPenguinsContract = '0xbd3531da5cf5857e7cfaa92426877b022e612cf8';
export const PudgyPenguinsTokenId = '5712';

// SVM Examples
export const RaydiumWSOLMarketTokenAccount = '4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A';
export const RaydiumWSOLMarketOwner = '3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv';
export const RaydiumV4ProgramId = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
export const USDC_WSOL_Pool = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2';
export const WSOLMint = 'So11111111111111111111111111111111111111112';
export const SPL2022ProgramId = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const PumpFunProgramId = 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA';
export const PumpFunMetadataNameExample = 'Pump';
export const PumpFunMetadataSymbolExample = 'PUMP';
export const PumpFunMetadataUriExample =
    'https://ipfs.io/ipfs/bafkreibcglldkfdekdkxgumlveoe6qv3pbiceypkwtli33clbzul7leo4m';

// ----------------------
// Response Schemas
// ----------------------

export const evmTokenResponseSchema = z.object({
    address: evmAddress,
    symbol: z.string(),
    decimals: z.number(),
});

export const svmMintResponseSchema = z.object({
    address: svmAddress,
    decimals: z.number(),
});

export const paginationQuerySchema = z.object({
    limit: limitSchema,
    page: pageSchema,
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const statisticsResponseSchema = z.object({
    elapsed: z.optional(z.number()),
    rows_read: z.optional(z.number()),
    bytes_read: z.optional(z.number()),
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
 * @property description - Description for OpenAPI/documentation metadata
 *
 * @note Only one of `default` or `prefault` can be set. This is enforced at the type level.
 */
type FieldConfig = {
    schema: z.ZodTypeAny;
    batched?: boolean;
    separator?: string;
    description?: string;
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
 *   - `description`: Optional description for OpenAPI metadata
 * @param include_pagination - Choose to include `limit` and `page` to the query parameters
 *
 * @returns Zod object schema for query parameters
 *
 * @example
 * ```ts
 * const querySchema = createQuerySchema({
 *   network: { schema: svmNetworkIdSchema },
 *   owner: { schema: svmOwnerSchema, batched: true },
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
                    description,
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
                            description: `[plan restricted] Single value or array of values (separate multiple values with \`${separator}\`).`,
                        });
                }

                // If no default or prefault, make it required with proper error message
                if (defaultValue === undefined && prefaultValue === undefined) {
                    resultSchema = z.preprocess((val, ctx) => {
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
                    }, resultSchema);
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

                if (description) resultSchema = resultSchema.meta({ ...resultSchema.meta(), description });

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
