import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/valibot'
import * as v from 'valibot'
import { config } from '../../../config.js'
import { makeUsageQuery } from '../../../handleQuery.js'
import { metaSchema, parseEvmAddress } from '../../../types/valibot.js'

const route = new Hono();

const paramSchema = v.object({
    contract: v.string(),
});

const querySchema = v.object({
    chain_id: v.optional(v.string()),
});

const responseSchema = v.object({
    data: v.array(v.object({
        timestamp: v.number(),
        date: v.string(),
        contract: v.string(),
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
                'application/json': { schema: resolver(responseSchema), example: {
                    data: [
                        {
                            "contract": "0x27695e09149adc738a978e9a678f99e4c39e9eb9",
                            "amount": "1239979319084415",
                            "timestamp": 1529002377,
                            "date": "2018-06-14"
                        }
                    ]
                }},
            },
        }
    },
})

// EVM ERC-20
// https://github.com/pinax-network/substreams-erc20/releases/tag/v1.5.0
const MODULE_HASH = "5b21ee0834a2c082a0befea1b71f771dc87d0f5e";

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const chain_id = c.req.query("chain_id") ?? "mainnet";
    const contract = parseEvmAddress(c.req.param("contract"));
    if (!contract) return c.json({ error: 'invalid EVM contract'}, 400);

    const TABLE = config.database ?? `${chain_id}:${MODULE_HASH}` // TO-IMPLEMENT: Chain ID + Module Hash
    const query = `
    SELECT
        concat('0x', contract) as contract,
        CAST(new_balance, 'String') AS amount,
        toUnixTimestamp(timestamp) as timestamp,
        date
    FROM ${TABLE}.balances
    WHERE contract = {contract: String}
    ORDER BY block_num DESC`;
    return makeUsageQuery(c, [query], { contract });
});

export default route;