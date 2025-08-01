import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { injectIcons } from '../../../inject/icon.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { sqlQueries } from '../../../sql/index.js';
import { SVM_networkIdSchema, WSOL, statisticsSchema, svmAddressSchema } from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    contract: WSOL,
});

const querySchema = z.object({
    network_id: SVM_networkIdSchema,
});

const responseSchema = z.object({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.string(),

            // -- contract --
            address: svmAddressSchema,

            // -- token --
            circulating_supply: z.string(),
            holders: z.number(),

            // -- chain --
            network_id: SVM_networkIdSchema,

            // -- icon --
            icon: z.object({
                web3icon: z.string(),
            }),

            // -- contract --
            symbol: z.optional(z.string()),
            name: z.optional(z.string()),
            decimals: z.optional(z.number()),

            // -- price --
            // price_usd: z.optional(z.number()),
            // market_cap: z.optional(z.number()),
            // low_liquidity: z.optional(z.boolean()),
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Metadata',
        description: 'Provides SVM token contract metadata.',
        tags: ['SVM'],
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
                                            block_num: 279194558,
                                            datetime: '2024-07-23 10:54:15',
                                            contract: '11112zAgXhc6hGfdfr5anSY91mq7Cs4HHpSVEQc4ASG\u0000',
                                            decimals: 9,
                                            symbol: 'TO IMPLEMENT',
                                            name: 'TO IMPLEMENT',
                                            circulating_supply: '1000048190.3747444',
                                            holders: 74,
                                            network_id: 'solana',
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

        const dbConfig = config.tokenDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        const query = sqlQueries.tokens_for_contract?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

        const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
        injectSymbol(response, params.network_id, true);
        injectIcons(response);
        return handleUsageQueryError(c, response);
    }
);

export default route;
