import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { injectIcons } from '../../../../../inject/icon.js';
import { injectSymbol } from '../../../../../inject/symbol.js';
import { sqlQueries } from '../../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    evmNetworkIdSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            last_update: dateTimeSchema,
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

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
        description: 'Returns Native token metadata including supply and holder count.',

        tags: ['EVM Tokens (Native)'],
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbBalances = config.balancesDatabases[params.network];

    if (!dbBalances) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.tokens_for_contract_native?.[dbBalances.type];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(
        c,
        [query],
        {
            ...params,
            db_balances: dbBalances.database,
        },
        {
            clickhouse_settings: { query_cache_ttl: config.cacheDurations[1] },
        }
    );
    injectSymbol(response, params.network, true);
    injectIcons(response);
    return handleUsageQueryError(c, response);
});

export default route;
