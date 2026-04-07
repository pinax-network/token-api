import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../handleQuery.js';
import { nativeMintRedirect } from '../../middleware/nativeContractRedirect.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    dateTimeSchema,
    svmAddressSchema,
    svmAuthoritySchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmSPLTokenProgramIdSchema,
    svmTokenAccountSchema,
    svmTransactionSchema,
    timestampSchema,
} from '../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../utils.js';
import query from './svm.sql' with { type: 'text' };

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },

    signature: {
        schema: svmTransactionSchema,
        batched: true,
        optional: true,
        meta: { example: '4Xj7G5UWDKWbPEKTMie8adzPD27qGRYLE9hpYwuad228Tw96aVBMqhc4XG5daAeLrJXGAqRnQw8Cbi129dQfynAd' },
    },
    // address: { schema: svmTokenAccountSchema, batched: true, default: '' },
    mint: {
        schema: svmMintSchema,
        batched: true,
        optional: true,
        meta: { example: 'So11111111111111111111111111111111111111112' },
    },
    source: {
        schema: svmTokenAccountSchema,
        batched: true,
        optional: true,
        meta: { example: 'HuxWhQJLCvuuSzHuBkHX1PVJ2LrpVz8GnTCaEkMRKgM1' },
    },
    destination: {
        schema: svmTokenAccountSchema,
        batched: true,
        optional: true,
        meta: { example: 'AtpmmidnYUTC1w62zHXfeXygDFQG8H2CU2fseFLwHiat' },
    },
    program_id: {
        schema: svmSPLTokenProgramIdSchema,
        batched: true,
        optional: true,
    },
    authority: {
        schema: svmAuthoritySchema,
        batched: true,
        optional: true,
        meta: { example: 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe' },
    },
    fee_payer: {
        schema: svmTokenAccountSchema,
        batched: true,
        optional: true,
        meta: { example: '3ghZcDUBHDGbgKPzmNnDXpAPb7gp2ApfkRtPWqRrGNTo' },
    },
    signer: {
        schema: svmTokenAccountSchema,
        batched: true,
        optional: true,
        meta: { example: '3ghZcDUBHDGbgKPzmNnDXpAPb7gp2ApfkRtPWqRrGNTo' },
    },
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

            // -- transaction --
            signature: z.string(),
            transaction_index: z.number(),
            instruction_index: z.number(),
            stack_height: z.number(),

            // -- instruction --
            program_id: svmSPLTokenProgramIdSchema,
            mint: svmMintSchema,
            authority: svmAuthoritySchema,
            multisig_authority: z.array(svmAuthoritySchema),
            signer: svmAddressSchema,
            signers: z.array(svmAddressSchema),

            // -- transfer --
            source: svmAddressSchema,
            destination: svmAddressSchema,
            amount: z.string(),
            value: z.number(),

            // -- token metadata --
            decimals: z.number().nullable(),
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            uri: z.string().nullable(),

            // -- fees --
            fee: z.number(),
            compute_units_consumed: z.number(),

            // -- chain --
            network: svmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Transfers',
        description: 'Returns SPL token transfers with program, authority, and account information.',

        tags: ['SVM Tokens'],
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
                                            block_num: 411673404,
                                            datetime: '2026-04-07 17:06:18',
                                            timestamp: 1775581578,
                                            signature:
                                                '4Xj7G5UWDKWbPEKTMie8adzPD27qGRYLE9hpYwuad228Tw96aVBMqhc4XG5daAeLrJXGAqRnQw8Cbi129dQfynAd',
                                            transaction_index: 208,
                                            instruction_index: 3,
                                            stack_height: 2,
                                            program_id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                                            mint: 'So11111111111111111111111111111111111111112',
                                            authority: 'HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC',
                                            multisig_authority: [],
                                            signer: '3ghZcDUBHDGbgKPzmNnDXpAPb7gp2ApfkRtPWqRrGNTo',
                                            signers: ['3ghZcDUBHDGbgKPzmNnDXpAPb7gp2ApfkRtPWqRrGNTo'],
                                            source: 'HuxWhQJLCvuuSzHuBkHX1PVJ2LrpVz8GnTCaEkMRKgM1',
                                            destination: 'AtpmmidnYUTC1w62zHXfeXygDFQG8H2CU2fseFLwHiat',
                                            fee_payer: '3ghZcDUBHDGbgKPzmNnDXpAPb7gp2ApfkRtPWqRrGNTo',
                                            amount: '927931314',
                                            value: 0.927931314,
                                            decimals: 9,
                                            name: 'Wrapped SOL',
                                            symbol: 'WSOL',
                                            fee: 5000,
                                            compute_units_consumed: 50323,
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

// TODO: Remove this middleware once migration is complete
route.use('/', nativeMintRedirect);

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbTransfers = config.transfersDatabases[params.network];
    const dbMetadata = config.metadataDatabases[params.network];

    if (!dbTransfers || !dbMetadata) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }

    const response = await makeUsageQueryJson(c, [query], {
        ...params,
        db_transfers: dbTransfers.database,
        db_metadata: dbMetadata.database,
    });
    return handleUsageQueryError(c, response);
});

export default route;
