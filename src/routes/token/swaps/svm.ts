import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { svmAddressSchema, SVM_networkIdSchema, statisticsSchema, svmProtocolSchema, tokenSchema, svmTransactionSchema, paginationQuery, USDC_WSOL, timestampSchema, orderBySchemaTimestamp, orderDirectionSchema, RaydiumV4, filterByAmm, filterByUser, SolanaProgramIds, filterByAmmPool, filterByMint } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { now } from '../../../utils.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(SVM_networkIdSchema),

    // -- `swaps` filter --
    program_id: SolanaProgramIds,
    amm: z.optional(filterByAmm),
    amm_pool: z.optional(filterByAmmPool),
    user: z.optional(filterByUser),
    input_mint: z.optional(filterByMint),
    output_mint: z.optional(filterByMint),

    // -- `time` filter --
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema),
    orderBy: z.optional(orderBySchemaTimestamp),
    orderDirection: z.optional(orderDirectionSchema),

    // -- `transaction` filter --
    signature: z.optional(svmTransactionSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),
        timestamp: z.number(),

        // -- ordering --
        transaction_index: z.number(),
        instruction_index: z.number(),

        // -- transaction --
        signature: z.string(),
        program_id: svmAddressSchema,
        program_name: z.string(),

        // -- swap --
        user: svmAddressSchema,
        amm: svmAddressSchema,
        amm_name: z.string(),
        amm_pool: z.optional(svmAddressSchema),

        input_mint: tokenSchema,
        input_amount: z.number(),
        output_mint: tokenSchema,
        output_amount: z.number(),

        // -- chain --
        network_id: SVM_networkIdSchema,
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Swap Events',
    description: 'Provides AMM Swap events.',
    tags: ['SVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [

                        ]
                    }
                },
            }
        },
    },
});

route.get('/', openapi, validator('query', querySchema), async (c) => {
    let program_id = c.req.query("program_id") ?? '';
    if (program_id) {
        const parsed = svmAddressSchema.safeParse(program_id);
        if (!parsed.success) {
            return c.json({ error: `Invalid program_id SVM address: ${parsed.error.message}` }, 400);
        }
        program_id = parsed.data;
    }

    let amm = c.req.query("amm") ?? '';
    if (amm) {
        const parsed = svmAddressSchema.safeParse(amm);
        if (!parsed.success) {
            return c.json({ error: `Invalid amm SVM address: ${parsed.error.message}` }, 400);
        }
        amm = parsed.data;
    }

    let amm_pool = c.req.query("amm_pool") ?? '';
    if (amm_pool) {
        const parsed = svmAddressSchema.safeParse(amm_pool);
        if (!parsed.success) {
            return c.json({ error: `Invalid amm_pool SVM address: ${parsed.error.message}` }, 400);
        }
        amm_pool = parsed.data;
    }

    let user = c.req.query("user") ?? '';
    if (user) {
        const parsed = svmAddressSchema.safeParse(user);
        if (!parsed.success) {
            return c.json({ error: `Invalid user SVM address: ${parsed.error.message}` }, 400);
        }
        user = parsed.data;
    }

    let input_mint = c.req.query("input_mint") ?? '';
    if (input_mint) {
        const parsed = svmAddressSchema.safeParse(input_mint);
        if (!parsed.success) {
            return c.json({ error: `Invalid input_mint SVM address: ${parsed.error.message}` }, 400);
        }
        input_mint = parsed.data;
    }

    let output_mint = c.req.query("output_mint") ?? '';
    if (output_mint) {
        const parsed = svmAddressSchema.safeParse(output_mint);
        if (!parsed.success) {
            return c.json({ error: `Invalid output_mint SVM address: ${parsed.error.message}` }, 400);
        }
        output_mint = parsed.data;
    }

    let signature = c.req.query("signature") ?? '';
    if (signature) {
        const parsed = svmTransactionSchema.safeParse(signature);
        if (!parsed.success) {
            return c.json({ error: `Invalid SVM transaction signature: ${parsed.error.message}` }, 400);
        }
        signature = parsed.data;
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

    const response = await makeUsageQueryJson(c, [query], { protocol, program_id, amm, amm_pool, user, input_mint, output_mint, network_id, signature, startTime, endTime }, { database });
    return handleUsageQueryError(c, response);
});

export default route;