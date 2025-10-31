import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import { SVM_ADDRESS_USER_EXAMPLE, SVM_MINT_USDC_EXAMPLE } from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    svmAddressSchema,
    svmAmmPoolSchema,
    svmAmmSchema,
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
    amm_pool: { schema: svmAmmPoolSchema, batched: true, default: '', meta: { example: '' } },
    user: { schema: svmAddressSchema, batched: true, default: '', meta: { example: SVM_ADDRESS_USER_EXAMPLE } },
    input_mint: {
        schema: svmMintSchema,
        batched: true,
        default: '',
        meta: { example: 'HmrzeZapM1EygFc4tBJUXwWTzv5Ahy8axLSAadBx51sw' },
    },
    output_mint: { schema: svmMintSchema, batched: true, default: '', meta: { example: SVM_MINT_USDC_EXAMPLE } },
    program_id: { schema: svmProgramIdSchema, batched: true, default: '' },

    start_time: { schema: timestampSchema, prefault: '2020-01-01' },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
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
            signature: svmTransactionSchema,
            transaction_index: z.number(),
            instruction_index: z.number(),

            // -- transaction --
            program_id: svmProgramIdSchema,
            program_name: z.string(),

            // -- swap --
            user: svmAddressSchema,
            amm: svmAmmSchema,
            amm_name: z.string(),
            amm_pool: svmAmmPoolSchema,

            input_mint: svmMintSchema,
            input_amount: z.number(),
            output_mint: svmMintSchema,
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
                                            block_num: 373763118,
                                            datetime: '2025-10-16 14:03:09',
                                            timestamp: 1760623389,
                                            signature:
                                                '5pdoVcSiSBr3LMAijdRYKrL5RoLFjLgHxHbZ34dUBVubnsQt3q1v48LuPazebsSiBVuSbSTyJdzf3G9jqqn8o6jA',
                                            transaction_index: 8,
                                            instruction_index: 1,
                                            program_id: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
                                            program_name: 'Jupiter Aggregator v6',
                                            amm: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
                                            amm_pool: '',
                                            user: '5MGfsuYNRhbuN6x1M6WaR3721dSDGtXpcsHxNsgkjsXC',
                                            input_mint: 'HmrzeZapM1EygFc4tBJUXwWTzv5Ahy8axLSAadBx51sw',
                                            input_amount: 49572355581648,
                                            output_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                                            output_amount: 936671,
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
