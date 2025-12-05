import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { injectIcons } from '../../../../inject/icon.js';
import { injectSymbol } from '../../../../inject/symbol.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    evmContractSchema,
    evmNetworkIdSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            last_update: dateTimeSchema,
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

            // -- contract --
            contract: evmContractSchema,

            // -- contract --
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            decimals: z.number().nullable(),

            // -- token --
            circulating_supply: z.number(),
            total_supply: z.number(),
            holders: z.number(),

            // -- chain --
            network: evmNetworkIdSchema,

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
        summary: 'Token Metadata',
        description: 'Returns ERC-20 token metadata including supply and holder count.',

        tags: ['EVM Tokens'],
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
                                            last_update: '2025-10-16 09:24:47',
                                            last_update_block_num: 23589316,
                                            last_update_timestamp: 1760606687,
                                            contract: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                                            name: 'Wrapped Ether',
                                            symbol: 'WETH',
                                            decimals: 18,
                                            circulating_supply: 2335108.0877502915,
                                            total_supply: 2335107.8841477665,
                                            holders: 3014993,
                                            network: 'mainnet',
                                            icon: {
                                                web3icon: 'ETH',
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.tokenDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.tokens_for_contract?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, {
        database: dbConfig.database,
        clickhouse_settings: { query_cache_ttl: config.cacheDurations[1] },
    });
    injectSymbol(response, params.network, true);
    injectIcons(response);
    return handleUsageQueryError(c, response);
});

export default route;
