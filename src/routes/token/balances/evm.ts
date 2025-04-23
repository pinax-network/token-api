import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { evmAddressSchema, paginationQuery, statisticsSchema, Vitalik, networkIdSchema, ageSchema, intervalSchema, timestampSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config, DEFAULT_AGE } from '../../../config.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    address: Vitalik,
});

let querySchema: any = z.object({
    network_id: z.optional(networkIdSchema),
    contract: z.optional(z.string()),
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
        network_id: networkIdSchema,

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
    summary: 'Token Balances by Wallet Address',
    description: 'The EVM Balances endpoint provides a snapshot of an account’s current token holdings. The endpoint returns the current balances of native and ERC-20 tokens held by a specified wallet address on an Ethereum-compatible blockchain.',
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
                                "block_num": 21764208,
                                "datetime": "2025-02-03 06:31:23",
                                "contract": "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
                                "amount": "339640316263000000000000000",
                                "value": 339640316.263,
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

    const address = parseAddress.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:${config.dbEvmSuffix}`;

    const contract = c.req.query("contract") ?? '';

    const query = sqlQueries['balances_for_account']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { address, network_id, contract }, { database });
    injectSymbol(response, network_id);
    // await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});

querySchema = z.object({
    interval: intervalSchema,
    network_id: z.optional(networkIdSchema),
    contracts: z.optional(z.string().array()),
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema)
}).merge(paginationQuery);

responseSchema = z.object({
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

openapi = describeRoute({
    summary: 'Historical Token Balances by Wallet Address',
    description: 'The EVM Historical Balances endpoint provides a history of an account’s token holdings. The endpoint returns the historical balances of native and ERC-20 tokens held by a specified wallet address on an Ethereum-compatible blockchain.',
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

route.get('/historical/:address', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
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
