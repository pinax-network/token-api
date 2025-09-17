import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    apiUsageResponse,
    EVM_networkIdSchema,
    evmAddressSchema,
    paginationQuery,
    Vitalik,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    address: Vitalik,
});

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        contract: evmAddressSchema.optional(),
    })
    .extend(paginationQuery.shape);

const responseSchema = apiUsageResponse.extend({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            last_balance_update: z.string(),

            // -- balance --
            contract: evmAddressSchema,
            amount: z.string(),
            value: z.number(),

            // -- contract --
            name: z.optional(z.string()),
            symbol: z.optional(z.string()),
            decimals: z.optional(z.number()),

            // -- network --
            network_id: EVM_networkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Balances',
        description:
            'Returns ERC-20 and native token balances for a wallet address.\n\nNative token contract is `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`.',

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
                                            block_num: 23383209,
                                            last_balance_update: '2025-09-17 13:50:23',
                                            contract: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                            amount: '1007231054304438990',
                                            value: 1.007231054304439,
                                            name: 'Ethereum',
                                            symbol: 'ETH',
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
        injectSymbol(response, params.network_id, true);

        return handleUsageQueryError(c, response);
    }
);

export default route;
