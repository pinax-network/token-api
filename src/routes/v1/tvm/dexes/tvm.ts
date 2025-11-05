import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    tvmAddressSchema,
    tvmFactorySchema,
    tvmNetworkIdSchema,
    tvmProtocolSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    factory: { schema: tvmFactorySchema, batched: true, default: '' },
    protocol: { schema: tvmProtocolSchema, default: '' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            factory: tvmAddressSchema,
            protocol: tvmProtocolSchema,
            transactions: z.number(),
            uaw: z.number(),
            last_activity: z.iso.datetime(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Supported DEXs',
        description: 'Returns supported TVM DEXs.',

        tags: ['TVM DEXs'],
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
                                            factory: 'TXk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF',
                                            protocol: 'justswap',
                                            transactions: 47301451,
                                            uaw: 2562671,
                                            last_activity: '2025-11-03 00:00:00',
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

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

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
