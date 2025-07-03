import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { svmAddressSchema, statisticsSchema, paginationQuery, orderBySchemaValue, WSOL, SVM_networkIdSchema, orderDirectionSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    contract: WSOL
});

const querySchema = z.object({
    network_id: z.optional(SVM_networkIdSchema),
    orderBy: z.optional(orderBySchemaValue),
    orderDirection: z.optional(orderDirectionSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),

        // -- contract --
        address: svmAddressSchema,
        amount: z.string(),
        value: z.number(),

        // -- chain --
        network_id: SVM_networkIdSchema,

        // -- contract --
        symbol: z.optional(z.string()),
        decimals: z.optional(z.number()),

        // -- price --
        // price_usd: z.optional(z.number()),
        // value_usd: z.optional(z.number()),
        // low_liquidity: z.optional(z.boolean()),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Token Holders',
    description: 'Provides SVM token holder balances by contract address.',
    tags: ['SVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 269656050,
                                "last_balance_update": "2024-06-03 15:10:14",
                                "owner": "HuX8huX8VfNw9WpMNpgzD8TC1fXiBqhpBeBvGhJXSuaL",
                                "amount": 7915210148973539,
                                "value": "7915210.148973539",
                                "decimals": 9,
                                "symbol": "TO IMPLEMENT",
                                "network_id": "solana"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseContract = svmAddressSchema.safeParse(c.req.param("contract"));
    if (!parseContract.success) return c.json({ error: `Invalid SVM contract: ${parseContract.error.message}` }, 400);

    const contract = parseContract.data;
    const network_id = SVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultSvmNetwork;
    const { database, type } = config.tokenDatabases[network_id]!;

    let query = sqlQueries['holders_for_contract']?.[type]; // TODO: Load different chain_type queries based on network_id
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
