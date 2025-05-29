import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
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
                                "block_num": 22589391,
                                "datetime": "2025-05-29 15:47:47",
                                "timestamp": 1748533667,
                                "transaction_id": "0x1ce019b0ad129b8bd21b6c83b75de5e5fd7cd07f2ee739ca3198adcbeb61f5a9",
                                "caller": "0x66a9893cc07d91d95644aedd05d03f95e1dba8af",
                                "pool": "0xb98437c7ba28c6590dd4e1cc46aa89eed181f97108e5b6221730d41347bc817f",
                                "factory": "0x000000000004444c5dc75cb358380d2e3de08a90",
                                "token0": {
                                    "address": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
                                    "symbol": "WBTC",
                                    "decimals": 8
                                },
                                "token1": {
                                    "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                                    "symbol": "USDC",
                                    "decimals": 6
                                },
                                "sender": "0x66a9893cc07d91d95644aedd05d03f95e1dba8af",
                                "recipient": null,
                                "amount0": "-894320",
                                "amount1": "957798098",
                                "value0": -0.0089432,
                                "value1": 957.798098,
                                "price0": 107417.48517180652,
                                "price1": 0.00000930947134352077,
                                "protocol": "uniswap_v4",
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            }
        },
    },
});

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