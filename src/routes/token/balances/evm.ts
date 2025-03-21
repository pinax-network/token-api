import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { makeUsageQuery } from '../../../handleQuery.js';
import { networkIdSchema, evmAddressSchema, paginationQuery, statisticsSchema } from '../../../types/zod.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_NETWORK_ID } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    address: evmAddressSchema,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    contract: z.optional(z.string()),
}).merge(paginationQuery);

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

        // -- network --
        network_id: networkIdSchema,
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    description: 'Token Balances by Wallet Address',
    tags: ['EVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 22067152,
                                "timestamp": 1742221043,
                                "date": "2025-03-17",
                                "contract": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                "amount": "159482036593475716150538",
                                "decimals": 18,
                                "symbol": "ETH",
                                "network_id": "mainnet"
                            },
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
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? DEFAULT_NETWORK_ID;
    const database = `${network_id}:${EVM_SUBSTREAMS_VERSION}`;

    const contract = c.req.query("contract") ?? '';

    const query = sqlQueries['balances_for_account']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    return makeUsageQuery(c, [query], { address, network_id, contract }, database);
});

export default route;