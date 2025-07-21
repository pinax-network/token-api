import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { paginationQuery, statisticsSchema, Vitalik, EVM_networkIdSchema, intervalSchema, evmAddressSchema, startTimeSchema, endTimeSchema } from '../../../../types/zod.js';
import { sqlQueries } from '../../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const paramSchema = z.object({
    address: Vitalik,
});

const querySchema = z.object({
    interval: intervalSchema,
    network_id: EVM_networkIdSchema,
    contracts: evmAddressSchema.array().default([]),
    startTime: startTimeSchema,
    endTime: endTimeSchema,
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        datetime: z.string().datetime(),
        contract: z.string(),
        name: z.string(),
        symbol: z.string(),
        decimals: z.number(),
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(withErrorResponses({
    summary: 'Historical Balances',
    description: 'Provides historical ERC-20 & Native balances by wallet address.',
    tags: ['EVM'],
    "x-tagGroups": ["Historical"],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "datetime": "2025-05-29 00:00:00",
                                "contract": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                "name": "Native",
                                "symbol": "ETH",
                                "decimals": 18,
                                "open": 237.63774262699187,
                                "high": 237.6377453469919,
                                "low": 0.10533323067535896,
                                "close": 0.15438623067535898,
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            },
        }
    },
}));

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema>; }; }>();

route.get('/:address', openapi, validator('param', paramSchema, validatorHook), validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const { database, type } = config.tokenDatabases[params.network_id]!;
    const query = sqlQueries['historical_balances_for_account']?.[type];
    if (!query) return c.json({ error: 'Query for historical balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database });
    return handleUsageQueryError(c, response);
});

export default route;
