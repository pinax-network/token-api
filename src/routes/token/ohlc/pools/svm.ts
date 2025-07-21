import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { statisticsSchema, paginationQuery, intervalSchema, SVM_networkIdSchema, USDC_WSOL, startTimeSchema, endTimeSchema } from '../../../../types/zod.js';
import { sqlQueries } from '../../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';
import { stables } from '../../../../inject/prices.tokens.js';

const paramSchema = z.object({
    pool: USDC_WSOL
});

const querySchema = z.object({
    network_id: SVM_networkIdSchema,
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

const openapi = describeRoute(withErrorResponses({
    summary: 'OHLCV by Pool',
    description: 'Provides pricing data in the Open/High/Low/Close/Volume (OHCLV) format.',
    tags: ['SVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "datetime": "2025-06-20 00:00:00",
                                "pool": "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2",
                                "token0": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                                "token1": "So11111111111111111111111111111111111111112",
                                "open": 146.64474747474748,
                                "high": 147.71993287074972,
                                "low": 145.0099569301824,
                                "close": 147.36215787385962,
                                "volume": 551499356.7426533,
                                "uaw": 337,
                                "transactions": 1021110,
                                "network_id": "solana"
                            }
                        ]
                    }
                },
            },
        }
    },
}));

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema>; }; }>();

route.get('/:pool', openapi, validator('param', paramSchema, validatorHook), validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const { database, type } = config.uniswapDatabases[params.network_id]!;
    const query = sqlQueries['ohlcv_prices_for_pool']?.[type];
    if (!query) return c.json({ error: 'Query for OHLC pool data could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], {
        ...params,
        high_quantile: 0.95,
        low_quantile: 0.05, 
        stablecoin_contracts: [...stables]
    }, { database });
    return handleUsageQueryError(c, response);
});

export default route;