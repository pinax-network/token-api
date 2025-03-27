import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { evmAddressSchema, statisticsSchema, paginationQuery, orderBySchema, contractAddressSchema } from '../../../types/zod.js';
import { DB_SUFFIX } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_NETWORK_ID } from '../../../config.js';
import { networkIdSchema } from '../../networks.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    contract: contractAddressSchema
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    order_by: z.optional(orderBySchema.default('desc')),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        timestamp: z.number(),
        date: z.string(),

        // -- contract --
        address: evmAddressSchema,
        amount: z.string(),

        // -- chain --
        network_id: networkIdSchema,

        // -- contract --
        symbol: z.optional(z.string()),
        decimals: z.optional(z.number()),

        // -- price --
        price_usd: z.optional(z.number()),
        value_usd: z.optional(z.number()),
        low_liquidity: z.optional(z.boolean()),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Token Holders by Contract Address',
    description: 'The EVM Holders endpoint provides information about the addresses holding a specific token, including each holder’s balance. This is useful for analyzing token distribution for a particular contract.',
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
                                "block_num": 21764208,
                                "timestamp": 1738564283,
                                "date": "2025-02-03",
                                "address": "0x5a52e96bacdabb82fd05763e25335261b270efcb",
                                "amount": "339640316263000000000000000",
                                "decimals": 18,
                                "symbol": "GRT",
                                "network_id": "mainnet",
                                "price_usd": 0.1040243665135064,
                                "value_usd": 35330868.74170554
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseContract = evmAddressSchema.safeParse(c.req.param("contract"));
    if (!parseContract.success) return c.json({ error: `Invalid EVM contract: ${parseContract.error.message}` }, 400);

    const contract = parseContract.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? DEFAULT_NETWORK_ID;
    const order_by = orderBySchema.safeParse(c.req.query("order_by")).data ?? "desc";
    const database = `${network_id}:${DB_SUFFIX}`;

    const query = sqlQueries['holders_for_contract']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { contract, network_id, order_by }, { database });
    injectSymbol(response, network_id);
    await injectPrices(response, network_id, contract);
    return handleUsageQueryError(c, response);
});

export default route;
