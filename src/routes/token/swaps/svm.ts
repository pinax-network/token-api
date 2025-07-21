import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { svmAddressSchema, SVM_networkIdSchema, statisticsSchema, tokenSchema, svmTransactionSchema, paginationQuery, orderBySchemaTimestamp, orderDirectionSchema, filterByAmm, filterByUser, filterByAmmPool, filterByMint, PumpFunAmmProgramId, startTimeSchema, endTimeSchema } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { validatorHook } from '../../../utils.js';

const querySchema = z.object({
    network_id: SVM_networkIdSchema,

    // -- `swaps` filter --
    program_id: PumpFunAmmProgramId,
    amm: filterByAmm.default(''),
    amm_pool: filterByAmmPool.default(''),
    user: filterByUser.default(''),
    input_mint: filterByMint.default(''),
    output_mint: filterByMint.default(''),

    // -- `time` filter --
    startTime: startTimeSchema,
    endTime: endTimeSchema,
    orderBy: orderBySchemaTimestamp,
    orderDirection: orderDirectionSchema,

    // -- `transaction` filter --
    signature: svmTransactionSchema.default(''),
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
                            {
                                "block_num": 352243599,
                                "datetime": "2025-07-09 22:24:36",
                                "timestamp": 1752099876,
                                "signature": "oWHA7wPQwpZhr9RJSbTNxsnPkBo1wnd68Zt2fJZPyK3cf1vYVzQiC9Et2mRNvh1t9Zt5dtmoEeSErSCqmMQ58Ls\u0000",
                                "program_id": "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
                                "program_name": "Pump.fun AMM",
                                "amm": "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
                                "amm_name": "Pump.fun AMM",
                                "amm_pool": "AmmpSnW5xVeKHTAU9fMjyKEMPgrzmUj3ah5vgvHhAB5J",
                                "user": "AEWxmZPEdHkCjJXVT9MreY7fCvzbpEK3wCVouCoEnmvE",
                                "input_mint": "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
                                "input_amount": 3653743,
                                "output_mint": "So11111111111111111111111111111111111111112",
                                "output_amount": 25548025,
                                "network_id": "solana"
                            }
                        ]
                    }
                },
            }
        },
    },
});

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema>; }; }>();

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const { database, type } = config.uniswapDatabases[params.network_id]!;
    const query = sqlQueries['swaps']?.[type];
    if (!query) return c.json({ error: 'Query for swaps could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database });
    return handleUsageQueryError(c, response);
});

export default route;