import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { statisticsSchema, paginationQuery, WETH, intervalSchema, EVM_networkIdSchema, startTimeSchema, endTimeSchema } from '../../../../types/zod.js';
import { sqlQueries } from '../../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { stables } from '../../../../inject/prices.tokens.js';
import { validatorHook } from '../../../../utils.js';

const paramSchema = z.object({
    contract: WETH
});

const querySchema = z.object({
    network_id: EVM_networkIdSchema,
    interval: intervalSchema,
    startTime: startTimeSchema,
    endTime: endTimeSchema,
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        datetime: z.string().datetime(),
        ticker: z.string(),
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
        volume: z.number(),
        uaw: z.number(),
        transactions: z.number()
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'OHLCV by Contract',
    description: 'Provides pricing data in the Open/High/Low/Close/Volume (OHCLV) format.',
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
                                "datetime": "2025-05-29 15:00:00",
                                "ticker": "WETHUSD",
                                "open": 2669.130852861705,
                                "high": 2669.130852861705,
                                "low": 2669.130852861705,
                                "close": 2669.130852861705,
                                "volume": 184897.1695477702,
                                "uaw": 31,
                                "transactions": 35
                            }
                        ]
                    }
                },
            },
        }
    },
});

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema>; }; }>();

route.get('/:contract', openapi, validator('param', paramSchema, validatorHook), validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const { database, type } = config.uniswapDatabases[params.network_id]!;
    const query = sqlQueries['ohlcv_prices_usd_for_contract']?.[type];
    if (!query) return c.json({ error: 'Query for OHLC price data could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { ...params, stablecoin_contracts: [...stables] }, { database });
    return handleUsageQueryError(c, response);
});

export default route;