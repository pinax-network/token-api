import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/valibot'
import * as v from 'valibot'
import { config } from '../../../config.js'
import { makeUsageQuery } from '../../../handleQuery.js'

const route = new Hono();

const paramSchema = v.object({
    contract: v.string(),
});

const querySchema = v.object({
    chain_id: v.optional(v.string()),
});

const responseSchema = v.object({
    timestamp: v.number(),
    date: v.string(),
    contract: v.string(),
    amount: v.string(),
});

const openapi = describeRoute({
    description: 'Token Holders by Contract Address',
    tags: ['EVM'],
    hide: false,
    responses: {
        200: {
            description: 'Token Holders',
            content: {
                'application/json': { schema: resolver(responseSchema), example: 'OK' },
            },
        }
    },
})

// EVM ERC-20
// https://github.com/pinax-network/substreams-erc20/releases/tag/v1.5.0
const MODULE_HASH = "5b21ee0834a2c082a0befea1b71f771dc87d0f5e";

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const chain_id = c.req.query("chain_id") ?? "mainnet";
    const contract = c.req.param("contract");

    const TABLE = config.database ?? `${chain_id}:${MODULE_HASH}` // TO-IMPLEMENT: Chain ID + Module Hash
    const query = `
    SELECT
        concat('0x', contract) as contract,
        CAST(new_balance, 'String') AS amount,
        toUnixTimestamp(timestamp) as timestamp,
        date
    FROM ${TABLE} balances
    WHERE contract = {contract: String}
    ORDER BY block_num DESC`;
    return makeUsageQuery(c, [query], { contract });
});

export default route;