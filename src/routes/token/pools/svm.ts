import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    SVM_networkIdSchema,
    USDC_WSOL,
    paginationQuery,
    statisticsSchema,
    svmAddressSchema,
    tokenSchema,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const querySchema = z
    .object({
        pool: USDC_WSOL,
        creator: svmAddressSchema.default(''),
        token: svmAddressSchema.default(''),
        network_id: SVM_networkIdSchema,
    })
    .merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.string(),

            // -- chain --
            network_id: SVM_networkIdSchema,

            // -- transaction --
            transaction_id: z.string(),

            // -- pool --
            factory: svmAddressSchema,
            pool: svmAddressSchema,
            token0: tokenSchema,
            token1: tokenSchema,
            fee: z.number(),
            protocol: z.string(),
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Liquidity Pools',
        description: 'Provides Raydium liquidity pool metadata.',
        tags: ['SVM'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': {
                        schema: resolver(responseSchema),
                        example: {
                            data: [
                                {
                                    block_num: 22589384,
                                    datetime: '2025-05-29 15:46:23',
                                    transaction_id:
                                        '0x43cee95f1449b6b4d394fab31234fd6decdcd049153cc1338fe627e5483a3d36',
                                    factory: '0x000000000004444c5dc75cb358380d2e3de08a90',
                                    pool: '0x12b900f4e5c4b1d2aab6870220345c668b068fc6e588dd59dfe6f223d60608f1',
                                    token0: {
                                        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
                                        symbol: 'USDT',
                                        decimals: 6,
                                    },
                                    token1: {
                                        address: '0xf2c88757f8d03634671208935974b60a2a28bdb3',
                                        symbol: 'SHELL',
                                        decimals: 18,
                                    },
                                    fee: 699000,
                                    protocol: 'uniswap_v4',
                                    network_id: 'mainnet',
                                },
                            ],
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

    const { database, type } = config.uniswapDatabases[params.network_id]!;
    const query = sqlQueries.pools?.[type];
    if (!query) return c.json({ error: 'Query for pools could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database });
    return handleUsageQueryError(c, response);
});

export default route;
