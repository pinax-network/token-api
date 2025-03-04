import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/valibot'
import * as v from 'valibot'
import { config } from '../../../config.js'
import { makeUsageQuery } from '../../../handleQuery.js'
import { metaSchema } from '../../../types/valibot.js'

const route = new Hono();

const paramSchema = v.object({
    address: v.string(),
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
    description: 'Token Balances by Wallet Address',
    tags: ['EVM'],
    security: [{ ApiKeyAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': { schema: resolver(responseSchema), example: {
                    data: [
                        {
                            "contract": "0xd6e1401a079922469e9b965cb090ea6ff64c6839",
                            "amount": "8974208837245497768568420",
                            "timestamp": 1529003200,
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

route.get('/:address', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const chain_id = c.req.query("chain_id") ?? "mainnet";
    const address = c.req.param("address");

    const TABLE = config.database ?? `${chain_id}:${MODULE_HASH}` // TO-IMPLEMENT: Chain ID + Module Hash
    const query = `
    SELECT
        concat('0x', contract) as contract,
        CAST(new_balance, 'String') AS amount,
        toUnixTimestamp(timestamp) as timestamp,
        date
    FROM ${TABLE}.balances
    WHERE owner = {address: String}
    ORDER BY block_num DESC`;
    return makeUsageQuery(c, [query], { address });
});

export default route;