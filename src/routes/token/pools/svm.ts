import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { svmAddressSchema, SVM_networkIdSchema, statisticsSchema, GRT, USDC_WSOL, protocolSchema, tokenSchema, paginationQuery } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(SVM_networkIdSchema),
    pool: z.optional(USDC_WSOL),
    creator: z.optional(svmAddressSchema),
    token: z.optional(svmAddressSchema)
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
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
    })),
    statistics: z.optional(statisticsSchema),
});


const openapi = describeRoute({
    summary: 'Liquidity Pools',
    description: 'Provides Raydium liquidity pool metadata.',
    tags: ['SVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 22589384,
                                "datetime": "2025-05-29 15:46:23",
                                "transaction_id": "0x43cee95f1449b6b4d394fab31234fd6decdcd049153cc1338fe627e5483a3d36",
                                "factory": "0x000000000004444c5dc75cb358380d2e3de08a90",
                                "pool": "0x12b900f4e5c4b1d2aab6870220345c668b068fc6e588dd59dfe6f223d60608f1",
                                "token0": {
                                    "address": "0xdac17f958d2ee523a2206206994597c13d831ec7",
                                    "symbol": "USDT",
                                    "decimals": 6
                                },
                                "token1": {
                                    "address": "0xf2c88757f8d03634671208935974b60a2a28bdb3",
                                    "symbol": "SHELL",
                                    "decimals": 18
                                },
                                "fee": 699000,
                                "protocol": "uniswap_v4",
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            }
        },
    },
});

route.get('/', openapi, validator('query', querySchema), async (c) => {
    let pool = c.req.query("pool") ?? '';
    if (pool) {
        const parsed = svmAddressSchema.safeParse(pool);
        if (!parsed.success) {
            return c.json({ error: `Invalid pool SVM address: ${parsed.error.message}` }, 400);
        }
        pool = parsed.data;
    }

    let token = c.req.query("token") ?? '';
    if (token) {
        const parsed = svmAddressSchema.safeParse(token);
        if (!parsed.success) {
            return c.json({ error: `Invalid token SVM address: ${parsed.error.message}` }, 400);
        }
        token = parsed.data;
    }

    let creator = c.req.query("creator") ?? '';
    if (creator) {
        const parsed = svmAddressSchema.safeParse(creator);
        if (!parsed.success) {
            return c.json({ error: `Invalid creator SVM address: ${parsed.error.message}` }, 400);
        }
        creator = parsed.data;
    }

    const network_id = SVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultSvmNetwork;
    const { database, type } = config.uniswapDatabases[network_id]!;

    const query = sqlQueries['pools']?.[type];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { pool, token, creator, network_id }, { database });
    return handleUsageQueryError(c, response);
});

export default route;