import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { evmAddressSchema, statisticsSchema, paginationQuery, Vitalik, networkIdSchema, timestampSchema, evmTransactionSchema, orderBySchemaTimestamp, orderDirectionSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';
import { now } from '../../../utils.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),

    // -- `token` filter --
    from: z.optional(evmAddressSchema),
    to: z.optional(Vitalik),
    contract: z.optional(evmAddressSchema),

    // -- `time` filter --
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema),
    orderBy: z.optional(orderBySchemaTimestamp),
    orderDirection: z.optional(orderDirectionSchema),

    // -- `transaction` filter --
    transaction_id: z.optional(evmTransactionSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),
        timestamp: z.number(),

        // -- transaction --
        transaction_id: z.string(),

        // -- transfer --
        contract: evmAddressSchema,
        from: evmAddressSchema,
        to: evmAddressSchema,
        amount: z.string(),
        value: z.number(),

        // -- chain --
        network_id: networkIdSchema,

        // -- contract --
        symbol: z.optional(z.string()),
        decimals: z.optional(z.number()),

        // // -- price --
        // price_usd: z.optional(z.number()),
        // value_usd: z.optional(z.number()),
        // low_liquidity: z.optional(z.boolean()),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Transfers Events',
    description: 'Provides ERC-20 & Native transfer events.',
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
                                "block_num": 22349873,
                                "datetime": "2025-04-26 01:18:47",
                                "timestamp": 1745630327,
                                "transaction_id": "0xd80ed9764b0bc25b982668f66ec1cf46dbe27bcd01dffcd487f43c92f72b2a84",
                                "contract": "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
                                "from": "0x7d2fbc0eefdb8721b27d216469e79ef288910a83",
                                "to": "0xa5eb953d1ce9d6a99893cbf6d83d8abcca9b8804",
                                "decimals": 18,
                                "symbol": "GRT",
                                "value": 11068.393958659999
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/', openapi, validator('query', querySchema), async (c) => {

    let from = c.req.query("from") ?? '';
    if (from) {
        const parsed = evmAddressSchema.safeParse(from);
        if (!parsed.success) {
            return c.json({ error: `Invalid [from] EVM address: ${parsed.error.message}` }, 400);
        }
        from = parsed.data;
    }

    let to = c.req.query("to") ?? '';
    if (to) {
        const parsed = evmAddressSchema.safeParse(to);
        if (!parsed.success) {
            return c.json({ error: `Invalid [to] EVM address: ${parsed.error.message}` }, 400);
        }
        to = parsed.data;
    }


    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = config.tokenDatabases[network_id];

    let contract = c.req.query("contract") ?? '';
    if (contract) {
        const parsed = evmAddressSchema.safeParse(contract);
        if (!parsed.success) {
            return c.json({ error: `Invalid contract EVM address: ${parsed.error.message}` }, 400);
        }
        contract = parsed.data;
    }

    let transaction_id = c.req.query("transaction_id") ?? '';
    if (transaction_id) {
        const parsed = evmTransactionSchema.safeParse(transaction_id);
        if (!parsed.success) {
            return c.json({ error: `Invalid EVM transaction ID: ${parsed.error.message}` }, 400);
        }
        transaction_id = parsed.data;
    }

    // -- `time` filter --
    const endTime = c.req.query('endTime') ?? now();
    if (endTime) {
        const parsed = timestampSchema.safeParse(endTime);
        if (!parsed.success) {
            return c.json({ error: `Invalid endTime: ${parsed.error.message}` }, 400);
        }
    }
    const startTime = c.req.query('startTime') ?? '0';
    if (startTime) {
        const parsed = timestampSchema.safeParse(startTime);
        if (!parsed.success) {
            return c.json({ error: `Invalid startTime: ${parsed.error.message}` }, 400);
        }
    }

    let query = sqlQueries['transfers']?.['evm'];
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    // reverse ORDER BY if defined
    const orderDirection = c.req.query('orderDirection') ?? 'desc';
    if (orderDirection) {
        const parsed = orderDirectionSchema.safeParse(orderDirection);
        if (!parsed.success) {
            return c.json({ error: `Invalid orderBy: ${parsed.error.message}` }, 400);
        }
        if (parsed.data === 'asc') {
            query = query.replaceAll(' DESC', ' ASC');
        }
        if (parsed.data === 'desc') {
            query = query.replaceAll(' ASC', ' DESC');
        }
    }

    const response = await makeUsageQueryJson(c, [query], { from, to, transaction_id, network_id, contract, startTime, endTime }, { database });
    injectSymbol(response, network_id);
    // await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});

export default route;
