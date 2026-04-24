import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../handleQuery.js';
import { injectIcons } from '../../inject/icon.js';
import { EVM_CONTRACT_USDT_EXAMPLE } from '../../types/examples.js';
import { apiUsageResponseSchema, createQuerySchema, evmContractSchema, evmNetworkIdSchema } from '../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../utils.js';

import query from './evm_metadata.sql' with { type: 'text' };

const querySchema = createQuerySchema(
    {
        network: { schema: evmNetworkIdSchema },
        contract: {
            schema: evmContractSchema,
            batched: true,
            meta: { example: EVM_CONTRACT_USDT_EXAMPLE },
        },
    },
    false
);

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            contract: evmContractSchema,
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            decimals: z.number().nullable(),
            network: evmNetworkIdSchema,
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
            'Returns lightweight ERC-20 token metadata (name, symbol, decimals) for one or more contracts. Does not include supply or holder counts.',
        tags: ['EVM Tokens (ERC-20)'],
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
                                            contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
                                            name: 'Tether USD',
                                            symbol: 'USDT',
                                            decimals: 6,
                                            network: 'mainnet',
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

    const dbBalances = config.balancesDatabases[params.network];

    if (!dbBalances) {
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
