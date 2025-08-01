import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    EVM_networkIdSchema,
    GRT,
    evmAddressSchema,
    orderBySchemaValue,
    orderDirectionSchema,
    paginationQuery,
    statisticsSchema,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    contract: GRT,
});

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        orderBy: orderBySchemaValue,
        orderDirection: orderDirectionSchema,
    })
    .merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            last_balance_update: z.string(),

            // -- contract --
            address: evmAddressSchema,
            amount: z.string(),
            value: z.number(),

            // -- chain --
            network_id: EVM_networkIdSchema,

            // -- contract --
            name: z.optional(z.string()),
            symbol: z.optional(z.string()),
            decimals: z.optional(z.number()),

            // -- price --
            price_usd: z.optional(z.number()),
            value_usd: z.optional(z.number()),
            low_liquidity: z.optional(z.boolean()),
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Holders',
        description: 'Provides ERC-20 token holder balances by contract address.',
        tags: ['EVM'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': {
                        schema: resolver(responseSchema),
                        examples: {
                            example: {
                                value: {
                                    data: [
                                        {
                                            block_num: 22966764,
                                            last_balance_update: '2025-07-21 09:47:11',
                                            address: '0x36aff7001294dae4c2ed4fdefc478a00de77f090',
                                            amount: '2904244446383157108596275005',
                                            value: 2904244446.3831573,
                                            name: 'Graph Token',
                                            decimals: 18,
                                            symbol: 'GRT',
                                            network_id: 'mainnet',
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
        },
    })
);

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema> } }>();

route.get(
    '/:contract',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.tokenDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        const query = sqlQueries.holders_for_contract?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for holders could not be loaded' }, 500);

        const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
        return handleUsageQueryError(c, response);
    }
);

export default route;
