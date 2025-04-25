import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod'
import { evmAddressSchema, networkIdSchema, statisticsSchema, protocolSchema, tokenSchema, evmTransactionSchema, paginationQuery, USDC_WETH, ageSchema } from '../../../types/zod.js';
import { config, DEFAULT_AGE } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),

    // -- `age` filter --
    age: z.optional(ageSchema),

    // -- `swaps` filter --
    pool: z.optional(USDC_WETH),
    caller: z.optional(evmAddressSchema),
    sender: z.optional(evmAddressSchema),
    recipient: z.optional(evmAddressSchema),
    transaction_id: z.optional(evmTransactionSchema),
    protocol: z.optional(protocolSchema),

    // -- `pools` filter --
    factory: z.optional(evmAddressSchema),
    token: z.optional(evmAddressSchema),

    // -- `contracts` filter --
    symbol: z.optional(z.string()),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),

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
        price: z.number(),
        fee: z.string(),
        protocol: z.string(),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Swap Events',
    description: 'Provides Uniswap V2 & V3 swap events.',
    tags: ['EVM'],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 14710703,
                                "datetime": "2025-04-24 01:44:22",
                                "transaction_id": "0x86d9b194eb4fbf6a6881b3fb509e405ff55923a06c37252e7e05b75070329354",
                                "caller": "0x0000000000bb343a4584faee3f532fbed4e0a768",
                                "pool": "0x65081cb48d74a32e9ccfed75164b8c09972dbcf1",
                                "factory": "0x1f98400000000000000000000000000000000003",
                                "token0": {
                                    "address": "0x078d782b760474a361dda0af3839290b0ef57ad6",
                                    "symbol": "USDC",
                                    "decimals": 6
                                },
                                "token1": {
                                    "address": "0x4200000000000000000000000000000000000006",
                                    "symbol": "WETH",
                                    "decimals": 18
                                },
                                "sender": "0x0000000000bb343a4584faee3f532fbed4e0a768",
                                "recipient": "0x0000000000bb343a4584faee3f532fbed4e0a768",
                                "amount0": "-3191855",
                                "amount1": "1779898235341342",
                                "value0": -3.191855,
                                "value1": 0.001779898235341342,
                                "price0": 0.0005573439334595022,
                                "price1": 1794.2242481996302,
                                "protocol": "uniswap_v3",
                                "network_id": "unichain"
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

    let token = c.req.query("token") ?? '';
    if (token) {
        const parsed = evmAddressSchema.safeParse(token);
        if (!parsed.success) {
            return c.json({ error: `Invalid token EVM address: ${parsed.error.message}` }, 400);
        }
        token = parsed.data;
    }

    const symbol = c.req.query("symbol") ?? '';
    const protocol = c.req.query("protocol") ?? '';
    if (protocol) {
        const parsed = protocolSchema.safeParse(protocol);
        if (!parsed.success) {
            return c.json({ error: `Invalid protocol: ${parsed.error.message}` }, 400);
        }
    }

    let factory = c.req.query("factory") ?? '';
    if (factory) {
        const parsed = evmAddressSchema.safeParse(factory);
        if (!parsed.success) {
            return c.json({ error: `Invalid factory EVM address: ${parsed.error.message}` }, 400);
        }
        factory = parsed.data;
    }

    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:${config.dbEvmSuffix}`;

    const age = ageSchema.safeParse(c.req.query("age")).data ?? DEFAULT_AGE;

    const query = sqlQueries['swaps']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { protocol, pool, token, factory, symbol, caller, sender, recipient, network_id, transaction_id, age }, { database });
    return handleUsageQueryError(c, response);
});

export default route;