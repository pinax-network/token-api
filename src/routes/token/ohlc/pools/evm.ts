import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { evmAddressSchema, statisticsSchema, paginationQuery, intervalSchema, timestampSchema, networkIdSchema, USDC_WETH } from '../../../../types/zod.js';
import { sqlQueries } from '../../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    pool: USDC_WETH
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
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
                                "datetime": "2025-04-22 01:00:00",
                                "ticker": "WETHUSDC",
                                "open": 1568.1231985920829,
                                "high": 1588.0055525937228,
                                "low": 1567.4961060936091,
                                "close": 1587.846767916931,
                                "volume": 7313447103818,
                                "uaw": 53,
                                "transactions": 309
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:pool', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parsePool = evmAddressSchema.safeParse(c.req.param("pool"));
    if (!parsePool.success) return c.json({ error: `Invalid EVM pool: ${parsePool.error.message}` }, 400);

    const pool = parsePool.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:evm-tokens@v1.11.0:db_out`; // Hotfix

    const query = sqlQueries['ohlcv_prices_for_pool']?.['evm']; // TODO: Load different chain_type queries based on network_id
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
