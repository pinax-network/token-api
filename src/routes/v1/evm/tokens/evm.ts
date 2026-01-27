import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { injectIcons } from '../../../../inject/icon.js';
import { injectSymbol } from '../../../../inject/symbol.js';
import { nativeContractRedirect } from '../../../../middleware/nativeContractRedirect.js';
import { sqlQueries } from '../../../../sql/index.js';
import { EVM_CONTRACT_USDT_EXAMPLE } from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    evmContractSchema,
    evmNetworkIdSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema(
    {
        network: { schema: evmNetworkIdSchema },
        contract: { schema: evmContractSchema, meta: { example: EVM_CONTRACT_USDT_EXAMPLE } },
    },
    false
);

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
                                            last_update: '2026-01-25 14:26:59',
                                            last_update_block_num: 24312418,
                                            last_update_timestamp: 1769351219,
                                            contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
                                            circulating_supply: 103302123410.98102,
                                            holders: 11573781,
                                            name: 'Tether USD',
                                            symbol: 'USDT',
                                            decimals: 6,
                                            network: 'mainnet',
                                            icon: {
                                                web3icon: 'USDT',
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

// TEMPORARY: Redirect native contract requests to /native endpoint
// TODO: Remove this middleware once migration is complete
route.use('/', nativeContractRedirect);

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbBalances = config.balancesDatabases[params.network];

    if (!dbBalances) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.tokens_for_contract?.[dbBalances.type];
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
