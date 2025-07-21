import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { svmAddressSchema, statisticsSchema, paginationQuery, orderBySchemaValue, WSOL, SVM_networkIdSchema, orderDirectionSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { validatorHook } from '../../../utils.js';

const paramSchema = z.object({
    contract: WSOL
});

const querySchema = z.object({
    network_id: SVM_networkIdSchema,
    orderBy: orderBySchemaValue,
    orderDirection: orderDirectionSchema,
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

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema>; }; }>();

route.get('/:contract', openapi, validator('param', paramSchema, validatorHook), validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const { database, type } = config.tokenDatabases[params.network_id]!;
    const query = sqlQueries['holders_for_contract']?.[type];
    if (!query) return c.json({ error: 'Query for holders could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database });
    return handleUsageQueryError(c, response);
});

export default route;