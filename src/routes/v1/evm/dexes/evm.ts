import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    evmAddressSchema,
    evmNetworkIdSchema,
    evmProtocolSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';
import { dexController } from '../../../../application/container.js';

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
