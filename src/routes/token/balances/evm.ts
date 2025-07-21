import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { evmAddressSchema, paginationQuery, statisticsSchema, Vitalik, EVM_networkIdSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { validatorHook } from '../../../utils.js';

const paramSchema = z.object({
    address: Vitalik,
});

let querySchema: any = z.object({
    network_id: EVM_networkIdSchema,
    contract: evmAddressSchema.default(''),
}).merge(paginationQuery);

let responseSchema: any = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),

        // -- balance --
        contract: evmAddressSchema,
        amount: z.string(),
        value: z.number(),

        // -- network --
        network_id: EVM_networkIdSchema,

        // -- contract --
        symbol: z.optional(z.string()),
        decimals: z.optional(z.number()),

        // -- price --
        price_usd: z.optional(z.number()),
        value_usd: z.optional(z.number()),
        low_liquidity: z.optional(z.boolean()),
    })),
    statistics: z.optional(statisticsSchema),
});

let openapi = describeRoute({
    summary: 'Balances by Address',
    description: 'Provides latest ERC-20 & Native balances by wallet address.',
    tags: ['EVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 22586773,
                                "datetime": "2025-05-29 06:58:47",
                                "contract": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                "amount": "237637742936991878321",
                                "value": 237.63774293699188,
                                "decimals": 18,
                                "symbol": "ETH",
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            },
        }
    },
});

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema>; }; }>();

route.get('/:address', openapi, validator('param', paramSchema, validatorHook), validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const { database, type } = config.tokenDatabases[params.network_id]!;
    const query = sqlQueries['balances_for_account']?.[type];
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database });
    return handleUsageQueryError(c, response);
});

export default route;