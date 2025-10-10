import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    evmAddressSchema,
    evmFactorySchema,
    evmNetworkIdSchema,
    evmPoolSchema,
    evmProtocolSchema,
    evmTokenResponseSchema,
    evmTransactionSchema,
    timestampSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

    transaction_id: { schema: evmTransactionSchema, batched: true, default: '' },
    pool: { schema: evmPoolSchema, batched: true, default: '' },
    caller: { schema: evmAddressSchema, batched: true, default: '' },
    sender: { schema: evmAddressSchema, batched: true, default: '' },
    recipient: { schema: evmAddressSchema, batched: true, default: '' },
    protocol: { schema: evmProtocolSchema, default: '' },

    start_time: { schema: timestampSchema, default: 1735689600 },
    end_time: { schema: timestampSchema, default: 9999999999 },
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

            // -- chain --
            network: evmNetworkIdSchema,

            // -- transaction --
            transaction_id: z.string(),

            // -- swap --
            caller: evmAddressSchema,
            sender: evmAddressSchema,
            recipient: evmAddressSchema,
            factory: evmFactorySchema,
            pool: evmPoolSchema,
            token0: evmTokenResponseSchema,
            token1: evmTokenResponseSchema,
            amount0: z.string(),
            amount1: z.string(),
            price0: z.number(),
            price1: z.number(),
            value0: z.number(),
            value1: z.number(),
            fee: z.string(),
            protocol: z.string(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Swap Events',
        description: 'Returns DEX swap transactions from Uniswap protocols with token amounts and prices.',

        tags: ['EVM DEXs'],
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
                                            block_num: 22589391,
                                            datetime: '2025-05-29 15:47:47',
                                            timestamp: 1748533667,
                                            transaction_id:
                                                '0x1ce019b0ad129b8bd21b6c83b75de5e5fd7cd07f2ee739ca3198adcbeb61f5a9',
                                            caller: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                                            pool: '0xb98437c7ba28c6590dd4e1cc46aa89eed181f97108e5b6221730d41347bc817f',
                                            factory: '0x000000000004444c5dc75cb358380d2e3de08a90',
                                            token0: {
                                                address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
                                                symbol: 'WBTC',
                                                decimals: 8,
                                            },
                                            token1: {
                                                address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                                                symbol: 'USDC',
                                                decimals: 6,
                                            },
                                            sender: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
                                            recipient: null,
                                            amount0: '-894320',
                                            amount1: '957798098',
                                            value0: -0.0089432,
                                            value1: 957.798098,
                                            price0: 107417.48517180652,
                                            price1: 0.00000930947134352077,
                                            protocol: 'uniswap_v4',
                                            network: 'mainnet',
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
    const params = c.get('validatedData');

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
