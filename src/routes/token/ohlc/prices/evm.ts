import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { evmAddressSchema, statisticsSchema, paginationQuery, WETH, intervalSchema, timestampSchema, networkIdSchema } from '../../../../types/zod.js';
import { sqlQueries } from '../../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { stables } from '../../../../inject/prices.tokens.js';

const route = new Hono();

const paramSchema = z.object({
    contract: WETH
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
                                "datetime": "2025-04-22 01:00:00",
                                "ticker": "WETHUSD",
                                "open": 1559.036656656456,
                                "high": 1588.0055525937225,
                                "low": 1559.036656656456,
                                "close": 1588.0055525937225,
                                "volume": 5500074.134435,
                                "uaw": 93,
                                "transactions": 1062
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseContract = evmAddressSchema.safeParse(c.req.param("contract"));
    if (!parseContract.success) return c.json({ error: `Invalid EVM contract: ${parseContract.error.message}` }, 400);

    const contract = parseContract.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = config.uniswapDatabases[network_id];

    const query = sqlQueries['ohlcv_prices_usd_for_contract']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for OHLCV prices could not be loaded' }, 500);

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
        contract,
        stablecoin_contracts: [...stables],
        min_datetime,
        max_datetime,
    }, { database });

    return handleUsageQueryError(c, response);
});

export default route;
