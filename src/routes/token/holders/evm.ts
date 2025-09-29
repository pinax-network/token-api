import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    apiUsageResponse,
    EVM_networkIdSchema,
    evmAddressSchema,
    GRT,
    orderBySchemaValue,
    orderDirectionSchema,
    paginationQuery,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    contract: GRT,
});

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        orderBy: orderBySchemaValue.optional(),
        orderDirection: orderDirectionSchema.optional(),
    })
    .extend(paginationQuery.shape);

const responseSchema = apiUsageResponse.extend({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            last_balance_update: z.string(),

            // -- contract --
            address: evmAddressSchema,
            amount: z.string(),
            value: z.number(),

            // -- contract --
            name: z.optional(z.string()),
            symbol: z.optional(z.string()),
            decimals: z.optional(z.number()),

            // -- chain --
            network_id: EVM_networkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Holders',
        description: 'Returns top token holders ranked by balance.',

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
                                            block_num: 23381678,
                                            last_balance_update: '2025-09-17 08:42:59',
                                            address: '0x36aff7001294dae4c2ed4fdefc478a00de77f090',
                                            amount: '2896517981175142125080776739',
                                            value: 2896517981.1751423,
                                            name: 'Graph Token',
                                            symbol: 'GRT',
                                            decimals: 18,
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

        const response = await makeUsageQueryJson(c, [query], params, {
            database: dbConfig.database,
            clickhouse_settings: { query_cache_ttl: config.cacheDurations[1] },
        });
        return handleUsageQueryError(c, response);
    }
);

export default route;
