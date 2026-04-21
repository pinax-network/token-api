import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../handleQuery.js';
import { apiUsageResponseSchema, createQuerySchema, svmMintSchema, svmNetworkIdSchema } from '../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../utils.js';

import query from './svm_metadata.sql' with { type: 'text' };

const querySchema = createQuerySchema(
    {
        network: { schema: svmNetworkIdSchema },
        mint: {
            schema: svmMintSchema,
            batched: true,
            meta: { example: 'So11111111111111111111111111111111111111112' },
        },
    },
    false
);

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            mint: svmMintSchema,
            decimals: z.number().nullable(),
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            uri: z.string().nullable(),
            network: z.string(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Metadata (lightweight)',
        description:
            'Returns lightweight SVM token metadata (name, symbol, decimals, uri) for one or more mints. Does not include supply or holder counts.',
        tags: ['SVM Tokens'],
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
                                            mint: 'So11111111111111111111111111111111111111112',
                                            decimals: 9,
                                            name: 'Wrapped SOL',
                                            symbol: 'SOL',
                                            uri: '',
                                            network: 'solana',
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

    const dbMetadata = config.metadataDatabases[params.network];
    const dbAccounts = config.accountsDatabases[params.network];

    if (!dbMetadata || !dbAccounts) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    if (!query) return c.json({ error: 'Query for tokens metadata could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], {
        ...params,
        db_metadata: dbMetadata.database,
        db_accounts: dbAccounts.database,
    });
    return handleUsageQueryError(c, response);
});

export default route;
