import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { injectSymbol } from '../../../../../inject/symbol.js';
import {
    TVM_ADDRESS_FROM_EXAMPLE,
    TVM_ADDRESS_NATIVE_TO_EXAMPLE,
    TVM_TRANSACTION_NATIVE_TRANSFER_EXAMPLE,
} from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    dateTimeSchema,
    timestampSchema,
    tvmAddressSchema,
    tvmNetworkIdSchema,
    tvmTransactionSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';
import { tokenController } from '../../../../../application/container.js';

const querySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },

    transaction_id: {
        schema: tvmTransactionSchema,
        batched: true,
        default: '',
        meta: { example: TVM_TRANSACTION_NATIVE_TRANSFER_EXAMPLE },
    },
    from_address: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_ADDRESS_FROM_EXAMPLE } },
    to_address: {
        schema: tvmAddressSchema,
        batched: true,
        default: '',
        meta: { example: TVM_ADDRESS_NATIVE_TO_EXAMPLE },
    },

    start_time: { schema: timestampSchema, prefault: '2015-01-01' },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
    start_block: { schema: blockNumberSchema, default: 0 },
    end_block: { schema: blockNumberSchema, default: 9999999999 },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: dateTimeSchema,
            timestamp: z.number(),

            // -- transaction --
            transaction_id: tvmTransactionSchema,
            transaction_index: z.number(),

            // -- transfer --
            from: tvmAddressSchema,
            to: tvmAddressSchema,

            amount: z.string(),
            value: z.number(),

            // -- contract --
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            decimals: z.number().nullable(),

            // -- chain --
            network: tvmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Native Transfers',
        description: 'Returns Native transfers with transaction and block data.',
        tags: ['TVM Tokens'],
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
                                            block_num: 77231160,
                                            datetime: '2025-11-05 14:57:36',
                                            timestamp: 1762354656,
                                            transaction_id:
                                                '7504152368a31f51dc0128f07b01815a4f1033c8247a7c2f415a55d59cfe4351',
                                            transaction_index: 260,
                                            from: 'TAYtGZzxZf1GhPfGwZKskWQnz7Qj3rwLDh',
                                            to: 'TMXZAySpsog7WtaeKb8WotoHepNsD1jjTc',
                                            amount: '4821375',
                                            value: 4.821375,
                                            name: 'Tron',
                                            symbol: 'TRX',
                                            decimals: 6,
                                            network: 'tron',
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

const handler = tokenController.createHandler({
    schema: querySchema,
    query: { key: 'transfers_native', errorMessage: 'Query for transfers could not be loaded' },
    buildQueryOptions: (_params, dbConfig) => ({ database: dbConfig.database }),
    postProcess: (response, params) => {
        injectSymbol(response, params.network, false);
    },
});

route.get('/', openapi, validator('query', querySchema, validatorHook), handler);

export default route;
