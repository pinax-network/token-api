import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    evmAddressSchema,
    evmNetworkIdSchema,
    evmProtocolSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema(
    {
        network: { schema: evmNetworkIdSchema },
    },
    false // Disable pagination for this endpoint, return all results in one go
);

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            factory: evmAddressSchema,
            protocol: evmProtocolSchema,
            uaw: z.number(),
            transactions: z.number(),
            last_activity: z.string().describe('ISO 8601 datetime string'),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Supported DEXs',
        description: 'Returns all supported EVM DEXs.',

        tags: ['EVM DEXs'],
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
                                            factory: '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',
                                            protocol: 'uniswap_v2',
                                            uaw: 10432787,
                                            transactions: 16029788,
                                            last_activity: '2025-11-06 16:00:00',
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.uniswapDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.supported_dexes?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for dexes could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, {
        database: dbConfig.database,
        clickhouse_settings: { query_cache_ttl: config.cacheDurations[1] },
    });
    return handleUsageQueryError(c, response);
});

export default route;
