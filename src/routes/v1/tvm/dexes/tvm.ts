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
    dateTimeSchema,
    tvmAddressSchema,
    tvmNetworkIdSchema,
    tvmProtocolSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema(
    {
        network: { schema: tvmNetworkIdSchema },
    }
);

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            factory: tvmAddressSchema,
            protocol: tvmProtocolSchema,
            transactions: z.number(),
            uaw: z.number(),
            last_activity: dateTimeSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Supported DEXs',
        description: 'Returns all supported TVM DEXs.',

        tags: ['TVM DEXs'],
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
                                            "protocol": "uniswap_v1",
                                            "factory": "TXk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF",
                                            "last_activity": "2025-12-16 05:16:18",
                                            "transactions": 48269088,
                                            "uaw": 2848148
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
