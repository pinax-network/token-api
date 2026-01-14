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
    tvmContractSchema,
    tvmNetworkIdSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },
    contract: { schema: tvmContractSchema },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            last_update: dateTimeSchema,
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

            contract: tvmContractSchema,
            decimals: z.number().nullable(),

            name: z.string().nullable(),
            symbol: z.string().nullable(),

            network: z.string(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Metadata',
        description: 'Provides TVM token contract metadata.',

        tags: ['TVM Tokens'],
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
                                            last_update: '2025-11-05 14:57:51',
                                            last_update_block_num: 77231165,
                                            last_update_timestamp: 1762354671,
                                            contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                                            decimals: 6,
                                            name: 'Tether USD',
                                            symbol: 'USDT',
                                            network: 'tron',
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

    const dbConfig = config.metadataDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.tokens_for_contract?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, {
        database: dbConfig.database,
    });
    return handleUsageQueryError(c, response);
});

export default route;
