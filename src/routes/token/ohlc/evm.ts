import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { evmAddressSchema, statisticsSchema, paginationQuery, contractAddressSchema, intervalSchema, timestampSchema } from '../../../types/zod.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_NETWORK_ID } from '../../../config.js';
import { networkIdSchema } from '../../networks.js';
import { stables } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    contract: contractAddressSchema
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
        volume: z.number()
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Token OHLCV prices by Contract Address',
    description: 'The EVM Prices endpoint provides pricing data in the Open/High/Low/Close/Volume (OHCLV) format.',
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
                                "datetime": "2025-03-22 03:20:00",
                                "ticker": "WETHUSD",
                                "open": 1985.478415394995,
                                "high": 1990.188570158394,
                                "low": 1981.7251934111157,
                                "close": 1981.7251934197654,
                                "volume": "120433"
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
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? DEFAULT_NETWORK_ID;
    const database = `${network_id}:${EVM_SUBSTREAMS_VERSION}`;

    const query = sqlQueries['ohlcv_prices_usd_for_contract']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for OHLCV prices could not be loaded' }, 500);

    const parseIntervalMinute = intervalSchema.transform((interval) => {
        switch (interval) {
            case 'hour':
                return 60;
            case 'day':
                return 1440;
            case 'week':
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
        contract,
        stablecoin_contracts: [...stables],
        min_datetime,
        max_datetime,
    }, { database });

    return handleUsageQueryError(c, response);
});

export default route;
