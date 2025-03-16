import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/valibot';
import * as v from 'valibot';
import { makeUsageQuery } from '../../../handleQuery.js';
import { chainIdSchema, EvmAddressSchema, metaSchema, parseEvmAddress } from '../../../types/valibot.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';

const route = new Hono();

const paramSchema = v.object({
    address: EvmAddressSchema,
});

const querySchema = v.object({
    chain_id: chainIdSchema,
});

const responseSchema = v.object({
    data: v.array(v.object({
        timestamp: v.number(),
        date: v.string(),
        contract: EvmAddressSchema,
        amount: v.string(),
    })),
    meta: v.optional(metaSchema),
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
    const address = parseEvmAddress(c.req.param("address"));
    if (!address) return c.json({ error: 'Invalid EVM address' }, 400);
    
    const chain_id = c.req.query("chain_id");
    const database = `${chain_id}:${EVM_SUBSTREAMS_VERSION}`;

    const query = sqlQueries['balances_for_account']?.['evm']; // TODO: Load different chain_type queries based on chain_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    return makeUsageQuery(c, [query], { address }, database);
});

export default route;