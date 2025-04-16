import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod'
import { APIErrorResponse } from '../../../utils.js';
import client from '../../../clickhouse/client.js';
import { contractAddressSchema, evmAddressSchema, networkIdSchema, statisticsSchema } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    pool: z.optional(contractAddressSchema),
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
        pool: evmAddressSchema,
        token0: evmAddressSchema,
        symbol0: z.string(),
        decimals0: z.number(),
        token1: evmAddressSchema,
        symbol1: z.string(),
        decimals1: z.number(),
        fee: z.number(),
        protocol: z.string(),
    })),
    statistics: z.optional(statisticsSchema),
});


const openapi = describeRoute({
    summary: 'Pools Uniswap V2 & V3',
    description: 'The Pools endpoint delivers metadata for Uniswap V2 & V3 liquidity pools.',
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
    // const parsePool = evmAddressSchema.safeParse(c.req.param("pool"));
    // if (!parsePool.success) return c.json({ error: `Invalid EVM contract: ${parsePool.error.message}` }, 400);

    // const pool = parsePool.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:${config.dbEvmSuffix}`;

    const query = sqlQueries['pools']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { pool: '', network_id }, { database });
    return handleUsageQueryError(c, response);
});

export default route;