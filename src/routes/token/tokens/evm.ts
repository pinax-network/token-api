import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { injectIcons } from '../../../inject/icon.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { sqlQueries } from '../../../sql/index.js';
import { apiUsageResponse, EVM_networkIdSchema, evmAddressSchema, GRT } from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    contract: GRT,
});

const querySchema = z.object({
    network_id: EVM_networkIdSchema,
});

const responseSchema = apiUsageResponse.extend({
    data: z.array(
        z.object({
            // -- block --
            last_update: z.iso.datetime(),
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

            // -- contract --
            contract: evmAddressSchema,

            // -- contract --
            name: z.string(),
            symbol: z.string(),
            decimals: z.number(),

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
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Metadata',
        description: 'Returns ERC-20 token metadata including supply, holder count, and price data.',

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
                                            last_update: '2025-09-17 14:26:47',
                                            last_update_block_num: 23383390,
                                            last_update_timestamp: 1758119207,
                                            contract: '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
                                            name: 'Graph Token',
                                            symbol: 'GRT',
                                            decimals: 18,
                                            circulating_supply: 10800334780.716036,
                                            total_supply: 10800262816.048214,
                                            holders: 174139,
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

        const response = await makeUsageQueryJson(c, [query], params, {
            database: dbConfig.database,
            clickhouse_settings: { query_cache_ttl: config.cacheDurations[1] },
        });
        injectSymbol(response, params.network_id, true);
        injectIcons(response);
        return handleUsageQueryError(c, response);
    }
);

export default route;
