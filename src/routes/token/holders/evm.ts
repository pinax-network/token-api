import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { evmAddressSchema, statisticsSchema, paginationQuery, orderBySchemaValue, GRT, networkIdSchema, orderDirectionSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    contract: GRT
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    orderBy: z.optional(orderBySchemaValue),
    orderDirection: z.optional(orderDirectionSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),

        // -- contract --
        address: evmAddressSchema,
        amount: z.string(),
        value: z.number(),

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
    summary: 'Token Holders',
    description: 'Provides ERC-20 token holder balances by contract address.',
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
                                "block_num": 22578579,
                                "last_balance_update": "2025-05-28 03:25:47",
                                "address": "0x36aff7001294dae4c2ed4fdefc478a00de77f090",
                                "amount": "2868440291872963359806035918",
                                "value": 2868440291.8729634,
                                "decimals": 18,
                                "symbol": "GRT",
                                "network_id": "mainnet"
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
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = config.tokenDatabases[network_id];

    let query = sqlQueries['holders_for_contract']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    // reverse ORDER BY if defined
    const orderDirection = c.req.query('orderDirection') ?? 'desc';
    if (orderDirection) {
        const parsed = orderDirectionSchema.safeParse(orderDirection);
        if (!parsed.success) {
            return c.json({ error: `Invalid orderBy: ${parsed.error.message}` }, 400);
        }
        if (parsed.data === 'asc') {
            query = query.replaceAll(' DESC', ' ASC');
        }
        if (parsed.data === 'desc') {
            query = query.replaceAll(' ASC', ' DESC');
        }
    }

    const response = await makeUsageQueryJson(c, [query], { contract, network_id }, { database });
    injectSymbol(response, network_id);
    // await injectPrices(response, network_id, contract);
    return handleUsageQueryError(c, response);
});

export default route;
