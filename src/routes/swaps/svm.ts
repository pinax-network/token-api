import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../handleQuery.js';
import { SVM_ADDRESS_USER_EXAMPLE, SVM_MINT_USDC_EXAMPLE } from '../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    dateTimeSchema,
    evmTokenResponseSchema,
    svmAddressSchema,
    svmAmmPoolSchema,
    svmAmmSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmProgramIdSchema,
    svmProtocolSchema,
    svmTransactionSchema,
    timestampSchema,
} from '../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../utils.js';

import query from './svm.sql' with { type: 'text' };

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },

    signature: { schema: svmTransactionSchema, batched: true, optional: true },
    amm: { schema: svmAmmSchema, batched: true, optional: true },
    amm_pool: { schema: svmAmmPoolSchema, batched: true, optional: true, meta: { example: '' } },
    user: { schema: svmAddressSchema, batched: true, optional: true, meta: { example: SVM_ADDRESS_USER_EXAMPLE } },
    fee_payer: { schema: svmAddressSchema, batched: true, optional: true },
    signer: { schema: svmAddressSchema, batched: true, optional: true },
    input_mint: {
        schema: svmMintSchema,
        batched: true,
        optional: true,
        meta: { example: 'HmrzeZapM1EygFc4tBJUXwWTzv5Ahy8axLSAadBx51sw' },
    },
    protocol: { schema: svmProtocolSchema, optional: true },

    output_mint: { schema: svmMintSchema, batched: true, optional: true, meta: { example: SVM_MINT_USDC_EXAMPLE } },
    program_id: { schema: svmProgramIdSchema, batched: true, optional: true },

    start_time: { schema: timestampSchema, optional: true },
    end_time: { schema: timestampSchema, optional: true },
    start_block: { schema: blockNumberSchema, optional: true },
    end_block: { schema: blockNumberSchema, optional: true },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: dateTimeSchema,
            timestamp: z.number(),

            // -- ordering --
            signature: svmTransactionSchema,
            transaction_index: z.number(),
            instruction_index: z.number(),
            stack_height: z.number(),

            // -- fees --
            fee: z.number(),
            compute_units_consumed: z.number(),

            // -- transaction --
            program_id: svmProgramIdSchema,
            program_name: z.string(),

            // -- swap --
            amm: svmAmmSchema,
            amm_pool: svmAmmPoolSchema,
            user: svmAddressSchema,

            input_token: evmTokenResponseSchema,
            output_token: evmTokenResponseSchema,

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
                                            stack_height: 1,
                                            program_id: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
                                            program_name: 'Jupiter Aggregator v6',
                                            fee: 5000,
                                            compute_units_consumed: 175632,
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbDex = config.dexesDatabases[params.network];
    const dbMetadata = config.metadataDatabases[params.network];
    const dbAccounts = config.accountsDatabases[params.network];

    if (!dbDex || !dbMetadata || !dbAccounts) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }

    const response = await makeUsageQueryJson(c, [query], {
        ...params,
        db_dex: dbDex.database,
        db_metadata: dbMetadata.database,
        db_accounts: dbAccounts.database,
    });
    return handleUsageQueryError(c, response);
});

export default route;
