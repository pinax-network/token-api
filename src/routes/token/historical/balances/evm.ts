import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { evmAddressSchema, paginationQuery, statisticsSchema, Vitalik, networkIdSchema, ageSchema, intervalSchema, timestampSchema } from '../../../../types/zod.js';
import { sqlQueries } from '../../../../sql/index.js';
import { z } from 'zod';
import { config, DEFAULT_AGE } from '../../../../config.js';
import { injectSymbol } from '../../../../inject/symbol.js';
import { injectPrices } from '../../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    address: Vitalik,
});

const querySchema = z.object({
    interval: intervalSchema,
    network_id: z.optional(networkIdSchema),
    contracts: z.optional(z.string().array()),
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema)
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        datetime: z.string().datetime(),
        contract: z.string(),
        name: z.string(),
        symbol: z.string(),
        decimals: z.string(),
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
        // uaw: z.number(),
        // transactions: z.number()
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
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
                                "block_num": 21764208,
                                "datetime": "2025-02-03 06:31:23",
                                "date": "2025-02-03",
                                "contract": "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
                                "amount": "339640316263000000000000000",
                                "decimals": 18,
                                "symbol": "GRT",
                                "network_id": "mainnet",
                                "price_usd": 0.10426804866144047,
                                "value_usd": 35413633.023497514
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:address', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseAddress = evmAddressSchema.safeParse(c.req.param("address"));
    if (!parseAddress.success) return c.json({ error: `Invalid EVM address: ${parseAddress.error.message}` }, 400);

    const parseContracts = z.string().array().optional().safeParse(c.req.queries("contracts"));
    if (!parseContracts.success) return c.json({ error: `Invalid EVM contracts: ${parseContracts.error.message}` }, 400);

    const address = parseAddress.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const contracts = parseContracts.data ?? [];
    const database = `${network_id}:${config.dbEvmSuffix}`;

    const query = sqlQueries['historical_balances_for_account']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const parseIntervalMinute = intervalSchema.transform((interval: string) => {
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
        interval_minute: String(parseIntervalMinute.data),
        address,
        contracts,
        min_datetime,
        max_datetime,
    }, { database });
    injectSymbol(response, network_id);
    // await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});

export default route;
