import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { svmAddressSchema, statisticsSchema, paginationQuery, SVM_networkIdSchema, timestampSchema, svmTransactionSchema, orderBySchemaTimestamp, orderDirectionSchema, WSOL, filterByTokenAccount, SolanaSPLTokenProgramIds, filterByAuthority } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { now } from '../../../utils.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(SVM_networkIdSchema),

    // -- `token` filter --
    mint: z.optional(WSOL),
    source: z.optional(filterByTokenAccount),
    destination: z.optional(filterByTokenAccount),
    authority: z.optional(filterByAuthority),
    program_id: z.optional(SolanaSPLTokenProgramIds),

    // -- `time` filter --
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema),
    orderBy: z.optional(orderBySchemaTimestamp),
    orderDirection: z.optional(orderDirectionSchema),

    // -- `transaction` filter --
    // signature: z.optional(svmTransactionSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),
        timestamp: z.number(),

        // -- transaction --
        signature: z.string(),

        // -- instruction --
        program_id: svmAddressSchema,
        mint: svmAddressSchema,
        authority: svmAddressSchema,

        // -- transfer --
        source: svmAddressSchema,
        destination: svmAddressSchema,
        amount: z.string(),
        value: z.number(),
        decimals: z.nullable(z.number().int()),

        // -- chain --
        network_id: SVM_networkIdSchema
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Transfers Events',
    description: 'Provides SPL transfer events.',
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
                                "block_num": 352372432,
                                "datetime": "2025-07-10 12:32:03",
                                "timestamp": 1752150723,
                                "signature": "4t7ZD3Fd8i9md6CTF6SEoZ9aPkr1fhRpXXSK2DhrUe5Wcm9VFdJ9Sn4WvbhdQaetLkiq8Xm3r5YgU1ffSJaA6c2e",
                                "program_id": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                                "authority": "J5kWrUKVPrtjwMVQLNgUEC9RY9Ujh8pYTN3nqWUkg1zp",
                                "mint": "So11111111111111111111111111111111111111112",
                                "source": "G4sbSww72omqHsC6tYe4syFtzHyBieS6MjbRWmSn1mt5",
                                "destination": "7ds7shXvLdNzihJXrjuoYYTr8bD5c2zwRxmZrrSZXgmM",
                                "amount": 333993128,
                                "decimals": 9,
                                "value": 0.333993128,
                                "network_id": "solana"
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
        const parsed = svmAddressSchema.safeParse(from);
        if (!parsed.success) {
            return c.json({ error: `Invalid [from] SVM address: ${parsed.error.message}` }, 400);
        }
        from = parsed.data;
    }

    let to = c.req.query("to") ?? '';
    if (to) {
        const parsed = svmAddressSchema.safeParse(to);
        if (!parsed.success) {
            return c.json({ error: `Invalid [to] SVM address: ${parsed.error.message}` }, 400);
        }
        to = parsed.data;
    }

    let source = c.req.query("source") ?? '';
    if (source) {
        const parsed = svmAddressSchema.safeParse(source);
        if (!parsed.success) {
            return c.json({ error: `Invalid [source] SVM address: ${parsed.error.message}` }, 400);
        }
        source = parsed.data;
    }

    let destination = c.req.query("destination") ?? '';
    if (destination) {
        const parsed = svmAddressSchema.safeParse(destination);
        if (!parsed.success) {
            return c.json({ error: `Invalid [destination] SVM address: ${parsed.error.message}` }, 400);
        }
        destination = parsed.data;
    }


    const network_id = SVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultSvmNetwork;
    const { database, type } = config.tokenDatabases[network_id]!;

    let program_id = c.req.query("program_id") ?? '';
    if (program_id) {
        const parsed = svmAddressSchema.safeParse(program_id);
        if (!parsed.success) {
            return c.json({ error: `Invalid program_id SVM address: ${parsed.error.message}` }, 400);
        }
        program_id = parsed.data;
    }

    let mint = c.req.query("mint") ?? '';
    if (mint) {
        const parsed = svmAddressSchema.safeParse(mint);
        if (!parsed.success) {
            return c.json({ error: `Invalid mint SVM address: ${parsed.error.message}` }, 400);
        }
        mint = parsed.data;
    }

    let authority = c.req.query("authority") ?? '';
    if (authority) {
        const parsed = svmAddressSchema.safeParse(authority);
        if (!parsed.success) {
            return c.json({ error: `Invalid authority SVM address: ${parsed.error.message}` }, 400);
        }
        authority = parsed.data;
    }

    let signature = c.req.query("signature") ?? '';
    if (signature) {
        const parsed = svmTransactionSchema.safeParse(signature);
        if (!parsed.success) {
            return c.json({ error: `Invalid SVM transaction signature: ${parsed.error.message}` }, 400);
        }
        signature = parsed.data;
    }

    // -- `time` filter --
    const endTime = c.req.query('endTime') || now();
    if (endTime) {
        const parsed = timestampSchema.safeParse(endTime);
        if (!parsed.success) {
            return c.json({ error: `Invalid endTime: ${parsed.error.message}` }, 400);
        }
    }
    const startTime = c.req.query('startTime') || '0';
    if (startTime) {
        const parsed = timestampSchema.safeParse(startTime);
        if (!parsed.success) {
            return c.json({ error: `Invalid startTime: ${parsed.error.message}` }, 400);
        }
    }

    let query = sqlQueries['transfers']?.[type];
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

    const response = await makeUsageQueryJson(c, [query], { from, to, source, authority, destination, program_id, signature, network_id, mint, startTime, endTime }, { database });
    // injectSymbol(response, network_id);
    // await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});

export default route;
