import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { statisticsSchema, paginationQuery, intervalSchema, timestampSchema, SVM_networkIdSchema, svmAddressSchema, USDC_WSOL } from '../../../../types/zod.js';
import { sqlQueries } from '../../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    pool: USDC_WSOL
});

const querySchema = z.object({
    network_id: z.optional(SVM_networkIdSchema),
    interval: intervalSchema,
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema)
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
});

route.get('/:pool', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parsePool = svmAddressSchema.safeParse(c.req.param("pool"));
    if (!parsePool.success) return c.json({ error: `Invalid SVM pool: ${parsePool.error.message}` }, 400);

    const pool = parsePool.data;
    const network_id = SVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultSvmNetwork;
    const { database, type } = config.uniswapDatabases[network_id]!;

    const query = sqlQueries['ohlcv_prices_for_pool']?.[type];
    if (!query) return c.json({ error: 'Query for OHLCV pool prices could not be loaded' }, 500);

    const parseIntervalMinute = intervalSchema.transform((interval) => {
        switch (interval) {
            case '1h':
                return 60;
            case '4h':
                return 240;
            case '1d':
                return 1440;
            case '1w':
                return 10080;
        }
    }).safeParse(c.req.query('interval'));
    if (!parseIntervalMinute.success) return c.json({ error: `Invalid Interval: ${parseIntervalMinute.error.message}` }, 400);

    const parseStart = timestampSchema.default(0).safeParse(c.req.query('startTime'));
    if (!parseStart.success) return c.json({ error: `Invalid StartTime: ${parseStart.error.message}` }, 400);

    const parseEnd = timestampSchema.default(9999999999).safeParse(c.req.query('endTime'));
    if (!parseEnd.success) return c.json({ error: `Invalid EndTime: ${parseEnd.error.message}` }, 400);

    const min_datetime = (new Date(parseStart.data)).toISOString();
    const max_datetime = (new Date(parseEnd.data)).toISOString();

    if (min_datetime > max_datetime)
        return c.json({ error: `Invalid period: startTime > endTime` }, 400);

    const response = await makeUsageQueryJson(c, [query], {
        network_id,
        interval_minute: parseIntervalMinute.data,
        high_quantile: 0.95,
        low_quantile: 0.05,
        pool,
        min_datetime,
        max_datetime,
    }, { database });

    return handleUsageQueryError(c, response);
});

export default route;
