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
    token: z.optional(evmAddressSchema),
    caller: z.optional(evmAddressSchema),
    sender: z.optional(evmAddressSchema),
    recipient: z.optional(evmAddressSchema),
    symbol: z.optional(z.string()),
    pool: z.optional(USDC_WETH),
    factory: z.optional(evmAddressSchema),

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
        token0: tokenSchema,
        token1: tokenSchema,
        amount0: z.string(),
        amount1: z.string(),
        value0: z.number(),
        value1: z.number(),
        // price: z.number(), // TO-DO: issue with Uniswap V3 Clickhouse MV
        // fee: z.string(),
        protocol: z.string(),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Swap Events',
    description: 'The Swap endpoint delivers Uniswap V2 & V3 swap events.',
    tags: ['EVM'],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 15543351,
                                "datetime": "2022-09-16 02:53:11",
                                "transaction_id": "0x28a73d36cd1944bad52b401a8ae2e0c59ac9863d9326cb7778159a80d3459c3e",
                                "caller": "0x1111111254fb6c44bac0bed2854e76f90643097d",
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
                                "sender": "0x1111111254fb6c44bac0bed2854e76f90643097d",
                                "recipient": "0x74de5d4fcbf63e00296fd95d33236b9794016631",
                                "amount0": "-101502640",
                                "amount1": "69387500000000000",
                                "value0": -101.50264,
                                "value1": 0.0693875,
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