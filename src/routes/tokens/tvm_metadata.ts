import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../handleQuery.js';
import { injectIcons } from '../../inject/icon.js';
import { apiUsageResponseSchema, createQuerySchema, tvmContractSchema, tvmNetworkIdSchema } from '../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../utils.js';

import query from './tvm_metadata.sql' with { type: 'text' };

const querySchema = createQuerySchema(
    {
        network: { schema: tvmNetworkIdSchema },
        contract: { schema: tvmContractSchema, batched: true },
    },
    false
);

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- identifiers --
            contract: tvmContractSchema,

            // -- token metadata --
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            decimals: z.number().nullable(),

            // -- chain --
            network: tvmNetworkIdSchema,

            // -- icon --
            icon: z
                .object({
                    web3icon: z.string(),
                })
                .optional(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Metadata (lightweight)',
        description:
            'Returns lightweight TRC-20 token metadata (name, symbol, decimals) for one or more contracts. Does not include supply, holders, or transfer counts.',
        tags: ['TVM Tokens (ERC-20)'],
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
                                            contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                                            name: 'Tether USD',
                                            symbol: 'USDT',
                                            decimals: 6,
                                            network: 'tron',
                                            icon: {
                                                web3icon: 'usdt',
                                            },
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

    const dbTransfers = config.transfersDatabases[params.network];

    if (!dbTransfers) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    if (!query) return c.json({ error: 'Query for tokens metadata could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], {
        ...params,
    });

    injectIcons(response);
    return handleUsageQueryError(c, response);
});

export default route;
