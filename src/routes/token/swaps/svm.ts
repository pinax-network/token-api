import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { svmAddressSchema, SVM_networkIdSchema, statisticsSchema, svmProtocolSchema, tokenSchema, svmTransactionSchema, paginationQuery, USDC_WSOL, timestampSchema, orderBySchemaTimestamp, orderDirectionSchema } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { now } from '../../../utils.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(SVM_networkIdSchema),

    // -- `swaps` filter --
    pool: z.optional(USDC_WSOL),
    sender: z.optional(svmAddressSchema),
    protocol: z.optional(svmProtocolSchema),

    // -- `time` filter --
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema),
    orderBy: z.optional(orderBySchemaTimestamp),
    orderDirection: z.optional(orderDirectionSchema),

    // -- `transaction` filter --
    transaction_id: z.optional(svmTransactionSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),
        timestamp: z.number(),

        // -- transaction --
        transaction_id: z.string(),

        // -- swap --
        pool: svmAddressSchema,
        token0: tokenSchema,
        token1: tokenSchema,
        sender: svmAddressSchema,
        amount0: z.string(),
        amount1: z.string(),
        value0: z.number(),
        value1: z.number(),
        price0: z.number(),
        price1: z.number(),
        protocol: z.string(),

        // -- chain --
        network_id: SVM_networkIdSchema,
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Swap Events',
    description: 'Provides Raydium swap events.',
    tags: ['SVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 351750524,
                                "datetime": "2025-07-07 16:02:09",
                                "timestamp": 1751904129,
                                "transaction_id": "64qhvcRb5siuSVoH7ZoNTVgDqnMcxmPZrw6ZKtTWSjJ6e8sexhT9EpjuwhmzkjjJV9JxegKmr2gD7mkiA3QcnUH6",
                                "pool": "3LcXtfrBixJu3ZZanoz6DfwFGThZ85ufVJe5co71b4eg",
                                "token0": {
                                    "address": "3tGNX8UMyxy48WQnWr7TQyUBGuwiS6ZcBhPSiR5RYMfM",
                                    "symbol": "TO IMPLEMENT",
                                    "decimals": 6
                                },
                                "token1": {
                                    "address": "So11111111111111111111111111111111111111112",
                                    "symbol": "TO IMPLEMENT",
                                    "decimals": 9
                                },
                                "sender": "B3TehHmo3oWNJxr4VC3D2t8eLRZ7um3tpJCZ7PJKnGYP",
                                "amount0": "-12042561",
                                "amount1": "1869917",
                                "value0": -12.042561,
                                "value1": 0.001869917,
                                "price0": 0.006440158039100132,
                                "price1": 155.2756926039237,
                                "protocol": "raydium_amm_v4",
                                "network_id": "solana"
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
        const parsed = svmAddressSchema.safeParse(pool);
        if (!parsed.success) {
            return c.json({ error: `Invalid pool SVM address: ${parsed.error.message}` }, 400);
        }
        pool = parsed.data;
    }

    let sender = c.req.query("sender") ?? '';
    if (sender) {
        const parsed = svmAddressSchema.safeParse(sender);
        if (!parsed.success) {
            return c.json({ error: `Invalid sender SVM address: ${parsed.error.message}` }, 400);
        }
        sender = parsed.data;
    }

    let transaction_id = c.req.query("transaction_id") ?? '';
    if (transaction_id) {
        const parsed = svmTransactionSchema.safeParse(transaction_id);
        if (!parsed.success) {
            return c.json({ error: `Invalid SVM transaction ID: ${parsed.error.message}` }, 400);
        }
        transaction_id = parsed.data;
    }

    // const symbol = c.req.query("symbol") ?? '';
    const protocol = c.req.query("protocol") ?? '';
    if (protocol) {
        const parsed = svmProtocolSchema.safeParse(protocol);
        if (!parsed.success) {
            return c.json({ error: `Invalid protocol: ${parsed.error.message}` }, 400);
        }
    }

    const network_id = SVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultSvmNetwork;
    const { database, type } = config.uniswapDatabases[network_id]!;

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

    let query = sqlQueries['swaps']?.[type];
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

    const response = await makeUsageQueryJson(c, [query], { protocol, pool, sender, network_id, transaction_id, startTime, endTime }, { database });
    return handleUsageQueryError(c, response);
});

export default route;