import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod'
import { evmAddressSchema, networkIdSchema, statisticsSchema, GRT, protocolSchema, tokenSchema, evmTransactionSchema, paginationQuery, WETH, USDC_WETH } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    caller: z.optional(evmAddressSchema),
    sender: z.optional(evmAddressSchema),
    recipient: z.optional(evmAddressSchema),
    pool: z.optional(USDC_WETH),

    // NOT IMPLEMENTED YET
    // Need to be added to the Clickhouse MV
    // factory: z.optional(evmAddressSchema),
    // token: z.optional(evmAddressSchema),
    // symbol: z.optional(z.string()),

    // NOT IMPLEMENTED YET
    // https://github.com/pinax-network/substreams-evm-tokens/issues/38
    // https://github.com/pinax-network/substreams-evm-tokens/issues/32
    transaction_id: z.optional(evmTransactionSchema),
    protocol: z.optional(protocolSchema),
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
        // token0: tokenSchema, // TO-DO: issue with Uniswap V3 Clickhouse MV
        // token1: tokenSchema, // TO-DO: issue with Uniswap V3 Clickhouse MV
        amount0: z.string(),
        amount1: z.string(),
        price0: z.number(),
        price1: z.number(),
        // value0: z.number(), // TO-DO: issue with Uniswap V3 Clickhouse MV
        // value1: z.number(), // TO-DO: issue with Uniswap V3 Clickhouse MV
        // price: z.number(), // TO-DO: issue with Uniswap V3 Clickhouse MV
        // fee: z.string(),
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
                                "block_num": 22332256,
                                "datetime": "2025-04-23 14:19:35",
                                "transaction_id": "0x8ec9070570d66a098234a105f3b4bf8bc4671f24811ad408dc24dc3019a7a193",
                                "caller": "0x5141b82f5ffda4c6fe1e372978f1c5427640a190",
                                "pool": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
                                "sender": "0x5141b82f5ffda4c6fe1e372978f1c5427640a190",
                                "recipient": "0x5141b82f5ffda4c6fe1e372978f1c5427640a190",
                                "amount0": "2717980487",
                                "amount1": "-1521761641325805521",
                                "price0": 560137491.5267727,
                                "price1": 1.7852759637179246e-9,
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

    const query = sqlQueries['swaps']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { protocol, pool, token, factory, symbol, caller, sender, recipient, network_id, transaction_id }, { database });
    return handleUsageQueryError(c, response);
});

export default route;