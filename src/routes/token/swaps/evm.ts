import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod'
import { evmAddressSchema, networkIdSchema, statisticsSchema, GRT, protocolSchema, tokenSchema, evmTransactionSchema, paginationQuery } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    token: z.optional(GRT),
    caller: z.optional(evmAddressSchema),
    sender: z.optional(evmAddressSchema),
    recipient: z.optional(evmAddressSchema),
    symbol: z.optional(z.string()),
    pool: z.optional(evmAddressSchema),
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
        price: z.number(),
        fee: z.string(),
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
                                "datetime": "2025-03-26 03:48:35",
                                "block_num": 22128490,
                                // ...
                            }
                        ]
                    }
                },
            }
        },
    },
})

route.get('/', openapi, validator('query', querySchema), async (c) => {
    const pool = c.req.query("pool") ?? '';
    if (pool) {
        const parsed = evmAddressSchema.safeParse(pool);
        if (!parsed.success) {
            return c.json({ error: `Invalid pool EVM address: ${parsed.error.message}` }, 400);
        }
    }

    const caller = c.req.query("caller") ?? '';
    if (caller) {
        const parsed = evmAddressSchema.safeParse(caller);
        if (!parsed.success) {
            return c.json({ error: `Invalid caller EVM address: ${parsed.error.message}` }, 400);
        }
    }

    const sender = c.req.query("sender") ?? '';
    if (sender) {
        const parsed = evmAddressSchema.safeParse(sender);
        if (!parsed.success) {
            return c.json({ error: `Invalid sender EVM address: ${parsed.error.message}` }, 400);
        }
    }

    const recipient = c.req.query("recipient") ?? '';
    if (recipient) {
        const parsed = evmAddressSchema.safeParse(recipient);
        if (!parsed.success) {
            return c.json({ error: `Invalid recipient EVM address: ${parsed.error.message}` }, 400);
        }
    }

    const transaction_id = c.req.query("transaction_id") ?? '';
    if (transaction_id) {
        const parsed = evmTransactionSchema.safeParse(transaction_id);
        if (!parsed.success) {
            return c.json({ error: `Invalid EVM transaction ID: ${parsed.error.message}` }, 400);
        }
    }

    const token = c.req.query("token") ?? '';
    if (token) {
        const parsed = evmAddressSchema.safeParse(token);
        if (!parsed.success) {
            return c.json({ error: `Invalid token EVM address: ${parsed.error.message}` }, 400);
        }
    }

    const symbol = c.req.query("symbol") ?? '';
    const protocol = c.req.query("protocol") ?? '';
    if (protocol) {
        const parsed = protocolSchema.safeParse(protocol);
        if (!parsed.success) {
            return c.json({ error: `Invalid protocol: ${parsed.error.message}` }, 400);
        }
    }

    const factory = c.req.query("factory") ?? '';
    if (factory) {
        const parsed = evmAddressSchema.safeParse(factory);
        if (!parsed.success) {
            return c.json({ error: `Invalid factory EVM address: ${parsed.error.message}` }, 400);
        }
    }

    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:${config.dbEvmSuffix}`;

    const query = sqlQueries['swaps']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { protocol, pool, token, factory, symbol, caller, sender, recipient, network_id, transaction_id }, { database });
    return handleUsageQueryError(c, response);
});

export default route;