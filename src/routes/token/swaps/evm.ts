import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod'
import { evmAddressSchema, networkIdSchema, statisticsSchema, protocolSchema, tokenSchema, evmTransactionSchema, paginationQuery, USDC_WETH, timestampSchema, orderBySchemaTimestamp, orderDirectionSchema } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { now } from '../../../utils.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),

    // -- `swaps` filter --
    pool: z.optional(USDC_WETH),
    caller: z.optional(evmAddressSchema),
    sender: z.optional(evmAddressSchema),
    recipient: z.optional(evmAddressSchema),
    protocol: z.optional(protocolSchema),

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

        // -- chain --
        network_id: networkIdSchema,

        // -- transaction --
        transaction_id: z.string(),

        // -- swap --
        caller: evmAddressSchema,
        sender: evmAddressSchema,
        recipient: evmAddressSchema,
        factory: evmAddressSchema,
        pool: evmAddressSchema,
        token0: tokenSchema,
        token1: tokenSchema,
        amount0: z.string(),
        amount1: z.string(),
        price0: z.number(),
        price1: z.number(),
        value0: z.number(),
        value1: z.number(),
        fee: z.string(),
        protocol: z.string(),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Swap Events',
    description: 'Provides Uniswap V2 & V3 swap events.',
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
                                "block_num": 22349926,
                                "datetime": "2025-04-26 01:29:23",
                                "timestamp": 1745630963,
                                "transaction_id": "0xbedbd3f7a7774b858c96aa39bcc3106c8741b61f0ee1434f7a682061b714129f",
                                "caller": "0x5141b82f5ffda4c6fe1e372978f1c5427640a190",
                                "pool": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
                                "factory": "0x1f98431c8ad98523631ae4a59f267346ea31f984",
                                "token0": {
                                    "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                                    "symbol": "USDC",
                                    "decimals": 6
                                },
                                "token1": {
                                    "address": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                                    "symbol": "WETH",
                                    "decimals": 18
                                },
                                "sender": "0x5141b82f5ffda4c6fe1e372978f1c5427640a190",
                                "recipient": "0x5141b82f5ffda4c6fe1e372978f1c5427640a190",
                                "amount0": "7044734362",
                                "amount1": "-3900976535378616196",
                                "value0": 7044.734362,
                                "value1": -3.900976535378616,
                                "price0": 0.0005539546527418627,
                                "price1": 1805.2019150852589,
                                "protocol": "uniswap_v3",
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            }
        },
    },
})

route.get('/', openapi, validator('query', querySchema), async (c) => {
    let pool = c.req.query("pool") ?? '';
    if (pool) {
        const parsed = evmAddressSchema.safeParse(pool);
        if (!parsed.success) {
            return c.json({ error: `Invalid pool EVM address: ${parsed.error.message}` }, 400);
        }
        pool = parsed.data;
    }

    let caller = c.req.query("caller") ?? '';
    if (caller) {
        const parsed = evmAddressSchema.safeParse(caller);
        if (!parsed.success) {
            return c.json({ error: `Invalid caller EVM address: ${parsed.error.message}` }, 400);
        }
        caller = parsed.data;
    }

    let sender = c.req.query("sender") ?? '';
    if (sender) {
        const parsed = evmAddressSchema.safeParse(sender);
        if (!parsed.success) {
            return c.json({ error: `Invalid sender EVM address: ${parsed.error.message}` }, 400);
        }
        sender = parsed.data;
    }

    let recipient = c.req.query("recipient") ?? '';
    if (recipient) {
        const parsed = evmAddressSchema.safeParse(recipient);
        if (!parsed.success) {
            return c.json({ error: `Invalid recipient EVM address: ${parsed.error.message}` }, 400);
        }
        recipient = parsed.data;
    }

    let transaction_id = c.req.query("transaction_id") ?? '';
    if (transaction_id) {
        const parsed = evmTransactionSchema.safeParse(transaction_id);
        if (!parsed.success) {
            return c.json({ error: `Invalid EVM transaction ID: ${parsed.error.message}` }, 400);
        }
        transaction_id = parsed.data;
    }

    // const symbol = c.req.query("symbol") ?? '';
    const protocol = c.req.query("protocol") ?? '';
    if (protocol) {
        const parsed = protocolSchema.safeParse(protocol);
        if (!parsed.success) {
            return c.json({ error: `Invalid protocol: ${parsed.error.message}` }, 400);
        }
    }

    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = config.uniswapDatabases[network_id];

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

    let query = sqlQueries['swaps']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

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

    const response = await makeUsageQueryJson(c, [query], { protocol, pool, caller, sender, recipient, network_id, transaction_id, startTime, endTime }, { database });
    return handleUsageQueryError(c, response);
});

export default route;