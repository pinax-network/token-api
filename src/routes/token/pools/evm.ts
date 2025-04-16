import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod'
import { evmAddressSchema, networkIdSchema, USDC_WETH, statisticsSchema, GRT } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';

const route = new Hono();

const paramSchema = z.object({
    address: GRT,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    pool: z.optional(USDC_WETH),
});

const tokenSchema = z.object({
    address: evmAddressSchema,
    symbol: z.string(),
    decimals: z.number(),
});


const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),

        // -- chain --
        network_id: networkIdSchema,

        // -- transaction --
        creator: evmAddressSchema,
        creator_transaction_id: z.string(),

        // -- pool --
        factory: evmAddressSchema,
        pool: tokenSchema,
        token0: tokenSchema,
        token1: tokenSchema,
        fee: z.number(),
        protocol: z.string(),
    })),
    statistics: z.optional(statisticsSchema),
});


const openapi = describeRoute({
    summary: 'Pools by Token',
    description: 'The Pools endpoint delivers contract details for Uniswap V2 & V3 liquidity pools.',
    tags: ['EVM'],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "datetime": "2025-03-26 03:48:35",
                                "block_num": 22128490,
                                // ...
                            }
                        ]
                    }
                },
            }
        },
    },
})

route.get('/', openapi, validator('query', querySchema), async (c) => {
    const pool = c.req.param("pool") ?? '';
    if (pool) {
        const parsed = evmAddressSchema.safeParse(c.req.param("pool"));
        if (!parsed.success) {
            return c.json({ error: `Invalid EVM address: ${parsed.error.message}` }, 400);
        }
    }

    // const pool = parsePool.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:${config.dbEvmSuffix}`;

    const query = sqlQueries['pools']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { pool, network_id }, { database });
    return handleUsageQueryError(c, response);
});

export default route;