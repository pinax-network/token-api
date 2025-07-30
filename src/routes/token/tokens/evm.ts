import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { injectIcons } from '../../../inject/icon.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { sqlQueries } from '../../../sql/index.js';
import { EVM_networkIdSchema, GRT, evmAddressSchema, statisticsSchema } from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    contract: GRT,
});

const querySchema = z.object({
    network_id: EVM_networkIdSchema,
});

const responseSchema = z.object({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.string(),
            timestamp: z.number(),

            // -- contract --
            contract: evmAddressSchema,

            // -- token --
            circulating_supply: z.number(),
            total_supply: z.number(),
            holders: z.number(),

            // -- chain --
            network_id: EVM_networkIdSchema,

            // -- icon --
            icon: z.object({
                web3icon: z.string(),
            }),

            // -- contract --
            symbol: z.optional(z.string()),
            name: z.optional(z.string()),
            decimals: z.optional(z.number()),

            // -- price --
            price_usd: z.optional(z.number()),
            market_cap: z.optional(z.number()),
            low_liquidity: z.optional(z.boolean()),
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Metadata',
        description: 'Provides ERC-20 token contract metadata.',
        tags: ['EVM'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': {
                        schema: resolver(responseSchema),
                        example: {
                            data: [
                                {
                                    block_num: 22966816,
                                    datetime: '2025-07-21 09:57:35',
                                    timestamp: 1753091855,
                                    contract: '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
                                    decimals: 18,
                                    symbol: 'GRT',
                                    name: 'Graph Token',
                                    circulating_supply: 27051707794.58071,
                                    total_supply: 10800262823.318213,
                                    holders: 175151,
                                    network_id: 'mainnet',
                                    icon: {
                                        web3icon: 'GRT',
                                    },
                                },
                            ],
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
