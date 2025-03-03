import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/valibot'
import * as v from 'valibot'
import { config } from '../../../config.js'
import { makeUsageQuery } from '../../../handleQuery.js'

const route = new Hono();

const paramSchema = v.object({
    address: v.string(),
});

const querySchema = v.object({
    chain_id: v.optional(v.string()),
});

const responseSchema = v.object({
    timestamp: v.number(),
    date: v.string(),
    contract: v.string(),
    from: v.string(),
    to: v.string(),
    value: v.string(),
});

const openapi = describeRoute({
    description: 'Token Transfers by Wallet Address',
    tags: ['EVM'],
    hide: false,
    responses: {
        200: {
            description: 'Token Transfers',
            content: {
                'application/json': { schema: resolver(responseSchema), example: 'OK' },
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
        concat('0x', from) as from,
        concat('0x', to) as to,
        CAST(value, 'String') AS value,
        toUnixTimestamp(timestamp) as timestamp,
        date
    FROM ${TABLE} transfers
    WHERE from = {address: String} OR to = {address: String}
    ORDER BY block_num DESC`;
    return makeUsageQuery(c, [query], { address });
});

export default route;