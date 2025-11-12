import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    tvmAddressSchema,
    tvmNetworkIdSchema,
    tvmProtocolSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';
import { dexController } from '../../../../application/container.js';

const querySchema = createQuerySchema(
    {
        network: { schema: tvmNetworkIdSchema },
    },
    false // Disable pagination for this endpoint, return all results in one go
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

const handler = dexController.createHandler({
    schema: querySchema,
    query: { key: 'supported_dexes', errorMessage: 'Query for dexes could not be loaded' },
    buildQueryOptions: (_params, dbConfig) => ({
        database: dbConfig.database,
        clickhouse_settings: { query_cache_ttl: config.cacheDurations[1] },
    }),
});

route.get('/', openapi, validator('query', querySchema, validatorHook), handler);

export default route;
