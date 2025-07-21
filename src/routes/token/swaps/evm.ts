import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { evmAddressSchema, EVM_networkIdSchema, statisticsSchema, protocolSchema, tokenSchema, evmTransactionSchema, paginationQuery, USDC_WETH, orderBySchemaTimestamp, orderDirectionSchema, startTimeSchema, endTimeSchema } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const querySchema = z.object({
    network_id: EVM_networkIdSchema,

    // -- `swaps` filter --
    pool: USDC_WETH.default(''),
    caller: evmAddressSchema.default(''),
    sender: evmAddressSchema.default(''),
    recipient: evmAddressSchema.default(''),
    protocol: protocolSchema.default(''),

    // -- `time` filter --
    startTime: startTimeSchema,
    endTime: endTimeSchema,
    orderBy: orderBySchemaTimestamp,
    orderDirection: orderDirectionSchema,

    // -- `transaction` filter --
    transaction_id: evmTransactionSchema.default(''),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),
        timestamp: z.number(),

        // -- chain --
        network_id: EVM_networkIdSchema,

        // -- transaction --
        transaction_id: z.string(),

        // -- swap --
        caller: evmAddressSchema,
        sender: evmAddressSchema,
        recipient: evmAddressSchema,
        factory: evmAddressSchema,
        pool: evmAddressSchema,
        token0: tokenSchema,
        token1: tokenSchema,
        amount0: z.string(),
        amount1: z.string(),
        price0: z.number(),
        price1: z.number(),
        value0: z.number(),
        value1: z.number(),
        fee: z.string(),
        protocol: z.string(),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(withErrorResponses({
    summary: 'Swap Events',
    description: 'Provides Uniswap V2 & V3 swap events.',
    tags: ['EVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 22589391,
                                "datetime": "2025-05-29 15:47:47",
                                "timestamp": 1748533667,
                                "transaction_id": "0x1ce019b0ad129b8bd21b6c83b75de5e5fd7cd07f2ee739ca3198adcbeb61f5a9",
                                "caller": "0x66a9893cc07d91d95644aedd05d03f95e1dba8af",
                                "pool": "0xb98437c7ba28c6590dd4e1cc46aa89eed181f97108e5b6221730d41347bc817f",
                                "factory": "0x000000000004444c5dc75cb358380d2e3de08a90",
                                "token0": {
                                    "address": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
                                    "symbol": "WBTC",
                                    "decimals": 8
                                },
                                "token1": {
                                    "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                                    "symbol": "USDC",
                                    "decimals": 6
                                },
                                "sender": "0x66a9893cc07d91d95644aedd05d03f95e1dba8af",
                                "recipient": null,
                                "amount0": "-894320",
                                "amount1": "957798098",
                                "value0": -0.0089432,
                                "value1": 957.798098,
                                "price0": 107417.48517180652,
                                "price1": 0.00000930947134352077,
                                "protocol": "uniswap_v4",
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            }
        },
    },
}));

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema>; }; }>();

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const { database, type } = config.uniswapDatabases[params.network_id]!;
    const query = sqlQueries['swaps']?.[type];
    if (!query) return c.json({ error: 'Query for swaps could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database });
    return handleUsageQueryError(c, response);
});

export default route;