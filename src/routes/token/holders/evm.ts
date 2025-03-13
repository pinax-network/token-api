import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/valibot';
import * as v from 'valibot';
import { makeUsageQuery } from '../../../handleQuery.js';
import { chainIdSchema, EvmAddressSchema, metaSchema, parseEvmAddress } from '../../../types/valibot.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';

const route = new Hono();

const paramSchema = v.object({
    contract: EvmAddressSchema,
});

const querySchema = v.object({
    chain_id: chainIdSchema,
    order_by: v.optional(v.string()),
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
    description: 'Token Holders by Contract Address',
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
                                "contract": "0x27695e09149adc738a978e9a678f99e4c39e9eb9",
                                "amount": "1239979319084415",
                                "timestamp": 1529002377,
                                "date": "2018-06-14"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const chain_id = c.req.query("chain_id");
    const contract = parseEvmAddress(c.req.param("contract"));
    if (!contract) return c.json({ error: 'invalid EVM contract' }, 400);

    const TABLE = `${chain_id}:${EVM_SUBSTREAMS_VERSION}`;
    const query = `
    SELECT
        concat('0x', owner) as address,
        CAST(new_balance, 'String') AS amount,
        toUnixTimestamp(timestamp) as timestamp,
        date
    FROM "${TABLE}".balances
    WHERE contract = {contract: String} AND new_balance > 0
    ORDER BY amount DESC`;
    return makeUsageQuery(c, [query], { contract });
});

export default route;