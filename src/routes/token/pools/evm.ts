import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    EVM_networkIdSchema,
    evmAddressSchema,
    paginationQuery,
    protocolSchema,
    statisticsSchema,
    tokenSchema,
    USDC_WETH,
    uniswapPoolSchema,
    WETH,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        pool: USDC_WETH.default(''),
        factory: evmAddressSchema.default(''),
        token: WETH.default(''),
        protocol: protocolSchema,
    })
    .extend(paginationQuery.shape);

const responseSchema = z.object({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.iso.datetime(),

            // -- transaction --
            transaction_id: z.string(),

            // -- pool --
            factory: evmAddressSchema,
            pool: uniswapPoolSchema,
            token0: tokenSchema,
            token1: tokenSchema,
            fee: z.number(),
            protocol: z.string(),

            // -- chain --
            network_id: EVM_networkIdSchema,
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Liquidity Pools',
        description: 'Provides Uniswap V2, V3, V4 liquidity pool metadata.',
        tags: ['EVM'],
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
                                            block_num: 23039540,
                                            datetime: '2025-07-31 14:00:11',
                                            transaction_id:
                                                '0xd9a2023a8cb1e49639bdab160dc5e706200b10b3bde91709fa41ab7ef44af58f',
                                            factory: '0x000000000004444c5dc75cb358380d2e3de08a90',
                                            pool: '0x3bdd63a1dcf34df8f6a568092646c6d49e482ecf3b824c06b352b7e37f96c3b8',
                                            token0: {
                                                address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
                                                symbol: 'wstETH',
                                                decimals: 18,
                                            },
                                            token1: {
                                                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                                                symbol: 'WETH',
                                                decimals: 18,
                                            },
                                            fee: 50,
                                            protocol: 'uniswap_v4',
                                            network_id: 'mainnet',
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

    const dbConfig = config.uniswapDatabases[params.network_id];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network_id}` }, 400);
    }
    const query = sqlQueries.pools?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for pools could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
