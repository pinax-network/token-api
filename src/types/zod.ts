import { z } from 'zod';
import { config, DEFAULT_AGE, DEFAULT_LIMIT, DEFAULT_MAX_AGE, DEFAULT_MAX_LIMIT } from '../config.js';

// ----------------------
// Common schemas
// ----------------------
export const evmAddress = z.coerce
    .string()
    .refine((val) => val === '' || /^(0[xX])?[0-9a-fA-F]{40}$/.test(val), 'Invalid EVM address');
export type EvmAddress = z.infer<typeof evmAddress>;
export const evmTransaction = z.coerce
    .string()
    .refine((val) => val === '' || /^(0[xX])?[0-9a-fA-F]{64}$/.test(val), 'Invalid EVM transaction');
export type EvmTransaction = z.infer<typeof evmTransaction>;

export const svmAddress = z.coerce
    .string()
    .refine((val) => val === '' || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val), 'Invalid SVM address');
export type SvmAddress = z.infer<typeof svmAddress>;
export const svmTransaction = z.coerce
    .string()
    .refine((val) => val === '' || /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(val), 'Invalid SVM transaction');
export type SvmTransaction = z.infer<typeof svmTransaction>;

export const blockNumHash = z.object({
    block_num: z.coerce.number().int(),
    block_hash: z.coerce.string(),
});
export type BlockNumHash = z.infer<typeof blockNumHash>;

export const version = z.coerce.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
export type Version = z.infer<typeof version>;

export const commit = z.coerce.string().regex(/^[0-9a-f]{7}$/);
export type Commit = z.infer<typeof commit>;

export const protocolSchema = z
    .enum(['', 'uniswap_v2', 'uniswap_v3', 'uniswap_v4'])
    .default('')
    .meta({ description: 'Protocol name', example: 'uniswap_v3' });
export const svmProtocolSchema = z
    .enum(['', 'raydium_amm_v4'])
    .default('')
    .meta({ description: 'Protocol name', example: 'raydium_amm_v4' });

export const evmAddressSchema = evmAddress
    .transform((addr) => addr.toLowerCase())
    .transform((addr) => (addr.length === 40 ? `0x${addr}` : addr))
    .pipe(z.string())
    .default('')
    .meta({
        description: 'Filter by address',
    });
export const evmTransactionSchema = evmTransaction
    .transform((addr) => addr.toLowerCase())
    .transform((addr) => (addr.length === 64 ? `0x${addr}` : addr))
    .pipe(z.string())
    .default('')
    .meta({
        description: 'Filter by transaction',
    });

export const uniswapPoolSchema = z
    .union([evmAddress, evmTransaction])
    .transform((addr) => addr.toLowerCase())
    .transform((addr) => (addr.length === 40 || addr.length === 64 ? `0x${addr}` : addr))
    .pipe(z.string())
    .default('')
    .meta({
        description: 'Filter by pool',
    });

export const svmAddressSchema = svmAddress.pipe(z.string()).default('').meta({
    description: 'Filter by address',
});
export const svmTransactionSchema = svmTransaction
    .pipe(z.string())
    .default('')
    .meta({ description: 'Filter by transaction signature' });

// z.enum argument type definition requires at least one element to be defined
export const EVM_networkIdSchema = z
    .enum([config.evmNetworks.at(0) ?? config.defaultEvmNetwork, ...config.evmNetworks.slice(1)])
    .default(config.defaultEvmNetwork)
    .meta({
        description: 'The Graph Network ID for EVM networks https://thegraph.com/networks',
        example: config.defaultEvmNetwork,
    });
export const SVM_networkIdSchema = z
    .enum([config.svmNetworks.at(0) ?? config.defaultSvmNetwork, ...config.svmNetworks.slice(1)])
    .default(config.defaultSvmNetwork)
    .meta({
        description: 'The Graph Network ID for SVM networks https://thegraph.com/networks',
        example: config.defaultSvmNetwork,
    });

export const ageSchema = z.coerce.number().int().min(1).max(DEFAULT_MAX_AGE).default(DEFAULT_AGE).meta({
    description: "Indicates how many days have passed since the data's creation or insertion.",
});
export const limitSchema = z.coerce.number().int().min(1).max(DEFAULT_MAX_LIMIT).default(DEFAULT_LIMIT).meta({
    description: 'The maximum number of items returned in a single request.',
});
export const pageSchema = z.coerce
    .number()
    .int()
    .min(1)
    // Trial-error, otherwise OFFSET value overflows into negative value when sent to ClickHouse
    .max(Math.floor(767465558638592 / DEFAULT_MAX_LIMIT))
    .default(1)
    .meta({ description: 'The page number of the results to return.' });
export const orderDirectionSchema = z.enum(['asc', 'desc']).default('desc').meta({
    description: 'The order in which to return the results: Ascending (asc) or Descending (desc).',
});
export const orderBySchemaTimestamp = z
    .enum(['timestamp'])
    .default('timestamp')
    .meta({ description: 'The field by which to order the results.' });
export const orderBySchemaValue = z
    .enum(['value'])
    .default('value')
    .meta({ description: 'The field by which to order the results.' });
export const intervalSchema = z
    .enum(['1h', '4h', '1d', '1w'])
    .default('1d')
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
                return 60;
        }
    })
    .meta({
        description: 'The interval for which to aggregate price data (hourly, 4-hours, daily or weekly).',
    });
export const timestampSchema = z.coerce
    .number()
    .int()
    .refine(
        (timestamp) => {
            return timestamp >= 0 && timestamp <= Number.MAX_SAFE_INTEGER;
        },
        {
            message: 'Timestamp must be a valid UNIX timestamp in seconds',
        }
    )
    .refine(
        (timestamp) => {
            // Convert seconds to milliseconds for JavaScript Date validation
            const date = new Date(timestamp * 1000);

            // Validate it's a valid date that JavaScript can handle
            return !Number.isNaN(date.getTime());
        },
        {
            message: 'Invalid timestamp',
        }
    )
    .meta({ description: 'UNIX timestamp in seconds.' });
export const startTimeSchema = timestampSchema.default(0);
export const endTimeSchema = timestampSchema.default(9999999999);

// NFT schemas
export const tokenIdSchema = z.coerce
    .string()
    .default('')
    .refine((val) => val === '' || /^(\d+|)$/.test(val), 'Must be a valid number or empty string')
    .meta({ description: 'NFT token ID' });
export const tokenStandardSchema = z.enum(['', 'ERC721', 'ERC1155']).default('');

// Used for examples
export const Vitalik = evmAddressSchema.meta({
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
}); // Vitalik Buterin wallet address
export const WETH = evmAddressSchema.meta({
    description: 'Filter by contract address',
    example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}); // WETH (Wrapped Ethereum)
export const GRT = evmAddressSchema.meta({
    description: 'Filter by contract address',
    example: '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
}); // GRT
export const USDC_WETH = uniswapPoolSchema.meta({
    description: 'Filter by pool address',
    example: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
}); // UDSC/WETH (Uniswap V3)
export const PudgyPenguins = evmAddressSchema.meta({
    description: 'Filter by NFT contract address',
    example: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
}); // Pudgy Penguins
export const PudgyPenguinsItem = tokenIdSchema.meta({
    description: 'NFT token ID',
    example: '5712',
});

// Solana examples
export const filterByAmm = svmAddressSchema.meta({
    description: 'Filter by amm address',
});
export const filterByAmmPool = svmAddressSchema.meta({
    description: 'Filter by amm pool address',
});
export const filterByProgramId = svmAddressSchema.meta({
    description: 'Filter by program ID',
});
export const filterByUser = svmAddressSchema.meta({
    description: 'Filter by user address',
});
export const filterByMint = svmAddressSchema.meta({
    description: 'Filter by mint address',
});
export const filterByTokenAccount = svmAddressSchema.meta({
    description: 'Filter by token account address',
});
export const filterByOwner = svmAddressSchema.meta({
    description: 'Filter by owner address',
});
export const filterByAuthority = svmAddressSchema.meta({
    description: 'Filter by authority token account address',
});

export const RaydiumWSOLMarketTokenAccount = filterByTokenAccount.meta({
    example: '4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A',
});
export const RaydiumWSOLMarketOwner = filterByOwner.meta({
    example: '3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv',
});

export const RaydiumV4 = filterByProgramId.meta({
    example: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
});
export const USDC_WSOL = filterByAmmPool.meta({
    example: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
});
export const WSOL = filterByMint.meta({
    example: 'So11111111111111111111111111111111111111112',
});
export const SolanaProgramIds = z
    .enum([
        '',
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
        'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
        'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    ])
    .meta({ description: 'Filter by program ID' });
export const SolanaSPLTokenProgramIds = z
    .enum(['', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'])
    .meta({ description: 'Filter by program ID' });
export const SPL2022 = SolanaSPLTokenProgramIds.meta({
    example: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
});
export const PumpFunAmmProgramId = SolanaProgramIds.meta({
    example: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
});

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
    limit: limitSchema.optional(),
    page: pageSchema.optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

export const statisticsSchema = z.object({
    elapsed: z.optional(z.number()),
    rows_read: z.optional(z.number()),
    bytes_read: z.optional(z.number()),
});

export const paginationSchema = z
    .object({
        previous_page: z.coerce.number().int().min(1),
        current_page: z.coerce.number().int().min(1),
        next_page: z.coerce.number().int().min(1),
        total_pages: z.coerce.number().int().min(1),
    })
    .refine(
        ({ previous_page, current_page, next_page, total_pages }) =>
            previous_page <= current_page && current_page <= next_page && next_page <= total_pages,
        "Requested page doesn't exist"
    );
export type PaginationSchema = z.infer<typeof paginationSchema>;

// ----------------------
// API Responses
// ----------------------

export const apiUsageResponse = z.object({
    data: z.array(z.any()),
    statistics: statisticsSchema,
    pagination: paginationSchema,
    results: z.number(),
    total_results: z.number(),
    request_time: z.date(),
    duration_ms: z.number(),
});
export type ApiUsageResponse = z.infer<typeof apiUsageResponse>;

const baseMessage = z.coerce.string();

// Define error code mappings by status code category
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

// Create filtered schemas with status-code-specific error codes
export const clientErrorResponse = z.object({
    status: z.union([z.literal(400), z.literal(401), z.literal(403), z.literal(404), z.literal(405)]),
    code: z.enum(clientErrorCodes),
    message: baseMessage,
});
export type ClientErrorResponse = z.infer<typeof clientErrorResponse>;

export const serverErrorResponse = z.object({
    status: z.union([z.literal(500), z.literal(502), z.literal(504)]),
    code: z.enum(serverErrorCodes),
    message: baseMessage,
});
export type ServerErrorResponse = z.infer<typeof serverErrorResponse>;

// Redefine apiErrorResponse as a union of client and server errors
export const apiErrorResponse = z.union([clientErrorResponse, serverErrorResponse]);
export type ApiErrorResponse = z.infer<typeof apiErrorResponse>;
