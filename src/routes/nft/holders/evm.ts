import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import { EVM_networkIdSchema, PudgyPenguins, evmAddressSchema, statisticsSchema } from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    contract: PudgyPenguins,
});

const querySchema = z.object({
    network_id: EVM_networkIdSchema,
});

const responseSchema = z.object({
    data: z.array(
        z.object({
            token_standard: z.string(),
            address: evmAddressSchema,
            quantity: z.number().openapi({ description: 'Number of tokens held by this address' }),
            unique_tokens: z.number().openapi({ description: 'Number of unique token IDs held by this address' }),
            percentage: z.number().openapi({ description: 'Percentage of total supply held by this address' }),
            network_id: EVM_networkIdSchema,
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Holders',
        description: 'Provides NFT holders per contract.',
        tags: ['EVM'],
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
                                            token_standard: 'ERC721',
                                            address: '0x29469395eaf6f95920e59f858042f0e28d98a20b',
                                            quantity: 534,
                                            unique_tokens: 534,
                                            percentage: 0.06008100810081008,
                                            network_id: 'mainnet',
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

route.get(
    '/:contract',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.nftDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        const query = sqlQueries.nft_holders?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for NFT holders could not be loaded' }, 500);

        const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
        return handleUsageQueryError(c, response);
    }
);

export default route;
