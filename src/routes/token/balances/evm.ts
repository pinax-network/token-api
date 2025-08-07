import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    EVM_networkIdSchema,
    evmAddressSchema,
    paginationQuery,
    statisticsSchema,
    Vitalik,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    address: Vitalik,
});

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        contract: evmAddressSchema.default(''),
    })
    .extend(paginationQuery.shape);

const responseSchema = z.object({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            last_balance_update: z.string(),

            // -- balance --
            contract: evmAddressSchema,
            amount: z.string(),
            value: z.number(),

            // -- network --
            network_id: EVM_networkIdSchema,

            // -- contract --
            name: z.optional(z.string()),
            symbol: z.optional(z.string()),
            decimals: z.optional(z.number()),

            // -- price --
            price_usd: z.optional(z.number()),
            value_usd: z.optional(z.number()),
            low_liquidity: z.optional(z.boolean()),
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Balances',
        description: 'Returns ERC-20 and native token balances for a wallet address with USD values.',

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
                                            block_num: 22968741,
                                            last_balance_update: '2025-07-21 16:24:47',
                                            contract: '0x6993301413c1867aafe2caaa692ec53a0118f06e',
                                            amount: '7917650000000000000000',
                                            value: 7917.65,
                                            name: 'BOLD',
                                            symbol: 'BOLD',
                                            decimals: 18,
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
    '/:address',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.tokenDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        const query = sqlQueries.balances_for_account?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

        const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
        return handleUsageQueryError(c, response);
    }
);

export default route;
