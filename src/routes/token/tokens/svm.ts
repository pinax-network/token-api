import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import { apiUsageResponse, SVM_networkIdSchema, WSOL } from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    mint: WSOL,
});

const querySchema = z.object({
    network_id: SVM_networkIdSchema,
});

const responseSchema = apiUsageResponse.extend({
    data: z.array(
        z.object({
            last_update: z.string(),
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

            program_id: z.string(),
            mint: z.string(),
            decimals: z.number(),

            name: z.string(),
            symbol: z.string(),
            uri: z.string(),

            // circulating_supply: z.number(),
            // total_supply: z.number(),
            // holders: z.number(),

            network_id: z.string(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Metadata',
        description: 'Provides SVM token contract metadata.',
        tags: ['SVM'],
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
                                            last_update: '2025-09-25 13:14:06',
                                            last_update_block_num: 369174420,
                                            last_update_timestamp: 1758806046,
                                            program_id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                                            mint: 'So11111111111111111111111111111111111111112',
                                            decimals: 9,
                                            name: 'Wrapped SOL',
                                            symbol: 'SOL',
                                            uri: null,
                                            network_id: 'solana',
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
    '/:mint',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.tokenDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        const query = sqlQueries.tokens_for_contract?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

        const response = await makeUsageQueryJson(c, [query], params, {
            database: dbConfig.database,
            clickhouse_settings: { query_cache_ttl: config.cacheDurations[1] },
        });
        return handleUsageQueryError(c, response);
    }
);

export default route;
