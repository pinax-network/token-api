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

            // input_token: svmTokenResponseSchema,
            // output_token: svmTokenResponseSchema,

            input_mint: svmMintSchema,
            input_amount: z.string(),
            output_mint: svmMintSchema,
            output_amount: z.string(),

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
                                            block_num: 413068609,
                                            datetime: '2026-04-14 02:04:25',
                                            timestamp: 1776132265,
                                            signature:
                                                '5eoS7eA6mj8bH7MbjRqLfT9BGG4Fzxh1gojUNK1ismWeZJYKLw9t7PXKCASSTyNi8uk6EhoD6HnwmWh9BjUHSQis',
                                            transaction_index: 22,
                                            instruction_index: 0,
                                            stack_height: 2,
                                            fee_payer: 'JBRAzagTHzHfv9EZYcjdg1iShfCuVQGJh3yavF9hh5qC',
                                            signer: 'JBRAzagTHzHfv9EZYcjdg1iShfCuVQGJh3yavF9hh5qC',
                                            signers: ['JBRAzagTHzHfv9EZYcjdg1iShfCuVQGJh3yavF9hh5qC'],
                                            fee: 49725,
                                            compute_units_consumed: 335695,
                                            program_id: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
                                            program_name: 'Whirlpools Program',
                                            amm: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
                                            amm_pool: '4Ui9QdDNuUaAGqCPcDSp191QrixLzQiLxJ1Gnqvz3szP',
                                            user: 'JBRAzagTHzHfv9EZYcjdg1iShfCuVQGJh3yavF9hh5qC',
                                            input_mint: '9gMRWNfLXNc54ta5LxuM16p72GYap2t6rf455TTBKQW4',
                                            input_amount: '506321',
                                            output_mint: 'CYcxSC2vmbScHFcTtEM6346uqMN8b9zeSGnP9qZu1E6U',
                                            output_amount: '85939',
                                            protocol: 'orca_whirlpool',
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
