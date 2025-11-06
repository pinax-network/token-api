import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    TVM_ADDRESS_SWAP_EXAMPLE,
    TVM_CONTRACT_USDT_EXAMPLE,
    TVM_CONTRACT_WTRX_EXAMPLE,
    TVM_FACTORY_SUNSWAP_EXAMPLE,
    TVM_POOL_USDT_WTRX_EXAMPLE,
    TVM_TRANSACTION_SWAP_EXAMPLE,
} from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    timestampSchema,
    tvmAddressSchema,
    tvmFactorySchema,
    tvmNetworkIdSchema,
    tvmPoolSchema,
    tvmProtocolSchema,
    tvmTokenResponseSchema,
    tvmTransactionSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },

    // transaction
    transaction_id: {
        schema: tvmTransactionSchema,
        batched: true,
        default: '',
        meta: { example: TVM_TRANSACTION_SWAP_EXAMPLE },
    },

    // swaps
    factory: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_FACTORY_SUNSWAP_EXAMPLE } },
    pool: { schema: tvmPoolSchema, batched: true, default: '', meta: { example: TVM_POOL_USDT_WTRX_EXAMPLE } },
    user: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_ADDRESS_SWAP_EXAMPLE } },
    input_token: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_CONTRACT_USDT_EXAMPLE } },
    output_token: {
        schema: tvmAddressSchema,
        batched: true,
        default: '',
        meta: { example: TVM_CONTRACT_WTRX_EXAMPLE },
    },
    protocol: { schema: tvmProtocolSchema, default: '' },

    // time and block range
    start_time: { schema: timestampSchema, prefault: '2015-01-01' },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
    start_block: { schema: blockNumberSchema, default: 0 },
    end_block: { schema: blockNumberSchema, default: 9999999999 },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.iso.datetime(),
            timestamp: z.number(),

            // -- transaction --
            transaction_id: z.string(),
            transaction_index: z.number(),

            // -- log --
            log_index: z.number(),
            log_ordinal: z.number(),
            log_address: tvmAddressSchema,
            log_topic0: z.string(),

            // -- swap --
            protocol: tvmProtocolSchema,
            factory: tvmFactorySchema,
            pool: tvmPoolSchema,
            user: tvmAddressSchema,

            // -- amounts --
            input_amount: z.string(),
            input_value: z.number(),
            input_token: tvmTokenResponseSchema,
            output_amount: z.string(),
            output_value: z.number(),
            output_token: tvmTokenResponseSchema,

            // -- chain --
            network: tvmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Swap Events',
        description: 'Returns DEX swap transactions from Tron protocols with token amounts and prices.',

        tags: ['TVM DEXs'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': {
                        schema: resolver(responseSchema),
                        examples: {
                            example: {
                                value: {
                                    data: [
                                        {
                                            block_num: 77233509,
                                            datetime: '2025-11-05 16:55:03',
                                            timestamp: 1762361703,
                                            transaction_id:
                                                'e74815245a8f1321ce5ede99cde8e021f75bf8e3d4f94cd8949d283eb56fee63',
                                            transaction_index: 0,
                                            log_index: 1,
                                            log_ordinal: 662,
                                            log_address: 'TFGDbUyP8xez44C76fin3bn3Ss6jugoUwJ',
                                            log_topic0:
                                                'd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
                                            protocol: 'sunswap',
                                            factory: 'TKWJdrQkqHisa1X8HUdHEfREvTzw4pMAaY',
                                            pool: 'TFGDbUyP8xez44C76fin3bn3Ss6jugoUwJ',
                                            user: 'TXF1xDbVGdxFGbovmmmXvBGu8ZiE3Lq4mR',
                                            input_amount: '170000000',
                                            input_value: 170,
                                            input_token: {
                                                address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                                                symbol: 'USDT',
                                                name: 'Tether USD',
                                                decimals: 6,
                                            },
                                            output_amount: '590270510',
                                            output_value: 590.27051,
                                            output_token: {
                                                address: 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR',
                                                symbol: 'WTRX',
                                                name: 'Wrapped TRX',
                                                decimals: 6,
                                            },
                                            network: 'tron',
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
        },
    })
);

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema> } }>();

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params: any = c.get('validatedData');
    // this DB is used to fetch TRC-20 token metadata (name, symbol, decimals)
    params.token_database = config.tokenDatabases[params.network]

    const dbConfig = config.uniswapDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.swaps?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for swaps could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
