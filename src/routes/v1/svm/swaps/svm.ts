import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    svmAddressSchema,
    svmAmmPoolSchema,
    svmAmmSchema,
    svmMintResponseSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmProgramIdSchema,
    svmTransactionSchema,
    timestampSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },

    signature: { schema: svmTransactionSchema, batched: true, default: '' },
    amm: { schema: svmAmmSchema, batched: true, default: '' },
    amm_pool: { schema: svmAmmPoolSchema, batched: true, default: '' },
    user: { schema: svmAddressSchema, batched: true, default: '' },
    input_mint: { schema: svmMintSchema, batched: true, default: '' },
    output_mint: { schema: svmMintSchema, batched: true, default: '' },
    program_id: { schema: svmProgramIdSchema, batched: true, default: '' },

    start_time: { schema: timestampSchema, default: 1735689600 },
    end_time: { schema: timestampSchema, default: 9999999999 },
    start_block: { schema: blockNumberSchema, default: 0 },
    end_block: { schema: blockNumberSchema, default: 9999999999 },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.iso.datetime(),
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

            input_mint: svmMintResponseSchema,
            input_amount: z.number(),
            output_mint: svmMintResponseSchema,
            output_amount: z.number(),

            // -- chain --
            network: svmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Swap Events',
        description: 'Returns AMM swap events from Solana DEXs with input/output tokens and amounts.',

        tags: ['SVM DEXs'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': {
                        schema: resolver(responseSchema),
                        examples: {
                            example: {
                                value: {
                                    data: [
                                        {
                                            block_num: 372221800,
                                            datetime: '2025-10-09 12:02:08',
                                            timestamp: 1760011328,
                                            signature:
                                                '3qcJzzpLU8BEGUUvcJRvdEiobcZiVrpEYSqS1mnhQhoNqXkT3hTWmYXGUwCmeVmuinUWtZ7LvXxX66CKyZUXSPdS',
                                            program_id: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
                                            program_name: 'Raydium Liquidity Pool V4',
                                            amm: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
                                            amm_pool: '2TEj7Y1chTcYs9zkaJe4vixnqtu78Pw1ycCUBj13zr9X',
                                            user: '9aSBR9f4SaDMrFFky8jKbsjr8EHRNeQm2PwseUsnVHR9',
                                            input_mint: 'FtJDf7AUidcVWyRJKumniPRWAKxAWSJwtLRx294hJYzj',
                                            input_amount: 57000000,
                                            output_mint: 'HgBRDKEjwuZkhbkvBURhpmy6bvP9mEzFYeAt5prVcFbR',
                                            output_amount: 960088729559,
                                            network: 'solana',
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
        },
    })
);

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema> } }>();

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const dbConfig = config.uniswapDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.swaps?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for swaps could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
