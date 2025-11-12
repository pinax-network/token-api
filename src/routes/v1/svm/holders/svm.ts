import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    svmAddressSchema,
    svmMintSchema,
    svmNetworkIdSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';
import { tokenController } from '../../../../application/container.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    mint: { schema: svmMintSchema },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.string(),

            // -- contract --
            address: svmAddressSchema,
            amount: z.string(),
            value: z.number(),

            // -- chain --
            network: svmNetworkIdSchema,

            // -- contract --
            symbol: z.optional(z.string()),
            decimals: z.optional(z.number()),

            // -- price --
            // price_usd: z.optional(z.number()),
            // value_usd: z.optional(z.number()),
            // low_liquidity: z.optional(z.boolean()),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Holders',
        description: 'Returns token holders ranked by balance with holdings and supply percentage.',

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
                                            block_num: 269656050,
                                            last_balance_update: '2024-06-03 15:10:14',
                                            owner: 'HuX8huX8VfNw9WpMNpgzD8TC1fXiBqhpBeBvGhJXSuaL',
                                            amount: 7915210148973539,
                                            value: '7915210.148973539',
                                            decimals: 9,
                                            symbol: 'TO IMPLEMENT',
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

const handler = tokenController.createHandler({
    schema: querySchema,
    query: { key: 'holders_for_contract', errorMessage: 'Query for holders could not be loaded' },
    buildQueryOptions: (_params, dbConfig) => ({ database: dbConfig.database }),
});

route.get('/', openapi, validator('query', querySchema, validatorHook), handler);

export default route;
