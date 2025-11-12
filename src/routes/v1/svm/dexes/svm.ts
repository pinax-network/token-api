import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    svmAmmSchema,
    svmNetworkIdSchema,
    svmProgramIdSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';
import { dexController } from '../../../../application/container.js';

const querySchema = createQuerySchema(
    {
        network: { schema: svmNetworkIdSchema },
    },
    false // Disable pagination for this endpoint, return all results in one go
);

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            program_id: svmProgramIdSchema,
            program_name: z.string(),
            amm: svmAmmSchema,
            amm_name: z.string(),
            is_aggregator: z.boolean(),
            transactions: z.number(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Supported DEXs',
        description: 'Returns all supported Solana DEXs.',

        tags: ['SVM DEXs'],
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
                                            program_id: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
                                            program_name: 'Jupiter Aggregator v6',
                                            amm: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
                                            amm_name: 'Raydium Liquidity Pool V4',
                                            is_aggregator: true,
                                            transactions: 1008573050,
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
