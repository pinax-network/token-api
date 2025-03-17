import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { makeUsageQuery } from '../../../handleQuery.js';
import { chainIdSchema, evmAddressSchema, limitSchema, metaSchema, offsetSchema } from '../../../types/zod.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_CHAIN_ID } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    address: evmAddressSchema,
});

const querySchema = z.object({
    chain_id: z.optional(chainIdSchema),
    limit: z.optional(limitSchema),
    offset: z.optional(offsetSchema),
});

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        timestamp: z.number(),
        date: z.string(),

        // -- balance --
        contract: evmAddressSchema,
        amount: z.string(),

        // -- contract --
        symbol: z.string(),
        decimals: z.number(),

        // -- chain --
        chain_id: chainIdSchema,
    })),
    meta: z.optional(metaSchema),
});

const openapi = describeRoute({
    description: 'Token Balances by Wallet Address',
    tags: ['EVM'],
    security: [{ ApiKeyAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "contract": "0xd6e1401a079922469e9b965cb090ea6ff64c6839",
                                "amount": "8974208837245497768568420",
                                "timestamp": 1529003200,
                                "date": "2018-06-14"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:address', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseAddress = evmAddressSchema.safeParse(c.req.param("address"));
    if (!parseAddress.success) return c.json({ error: `Invalid EVM address: ${parseAddress.error.message}` }, 400);

    const address = parseAddress.data;
    const chain_id = chainIdSchema.safeParse(c.req.query("chain_id")).data ?? DEFAULT_CHAIN_ID;
    const database = `${chain_id}:${EVM_SUBSTREAMS_VERSION}`;

    const query = sqlQueries['balances_for_account']?.['evm']; // TODO: Load different chain_type queries based on chain_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    return makeUsageQuery(c, [query], { address, chain_id }, database);
});

export default route;