import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { injectSymbol } from '../../../../inject/symbol.js';
import {
    EVM_ADDRESS_TO_EXAMPLE,
    EVM_CONTRACT_NATIVE_EXAMPLE,
    EVM_TRANSACTION_TRANSFER_EXAMPLE,
} from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    dateTimeSchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    evmTransactionSchema,
    timestampSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';
import { tokenController } from '../../../../application/container.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

    transaction_id: {
        schema: evmTransactionSchema,
        batched: true,
        default: '',
        meta: { example: EVM_TRANSACTION_TRANSFER_EXAMPLE },
    },
    contract: { schema: evmContractSchema, batched: true, default: '', meta: { example: EVM_CONTRACT_NATIVE_EXAMPLE } },
    // address: { schema: evmAddressSchema, batched: true, default: '' },
    from_address: { schema: evmAddressSchema, batched: true, default: '' },
    to_address: { schema: evmAddressSchema, batched: true, default: '', meta: { example: EVM_ADDRESS_TO_EXAMPLE } },

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
            transaction_id: evmTransactionSchema,

            // -- transfer --
            contract: evmContractSchema,
            from: evmAddressSchema,
            to: evmAddressSchema,

            // -- contract --
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            decimals: z.number().nullable(),

            amount: z.string(),
            value: z.number(),

            // -- chain --
            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Transfers',
        description: 'Returns ERC-20 and native token transfers with transaction and block data.',
        tags: ['EVM Tokens'],
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
                                            block_num: 23565775,
                                            datetime: '2025-10-13 02:19:47',
                                            timestamp: 1760321987,
                                            transaction_id:
                                                '0x96b1b180d22dae2b18a783ebdd5ae33f6867f3572f87c69a135c6c0a15a63c8e',
                                            log_index: 4404,
                                            contract: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                            from: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
                                            to: '0xdadb0d80178819f2319190d340ce9a924f783711',
                                            name: 'Native',
                                            symbol: 'ETH',
                                            decimals: 18,
                                            amount: '5038198000000',
                                            value: 0.000005038198,
                                            network: 'mainnet',
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
    query: { key: 'transfers', errorMessage: 'Query for transfers could not be loaded' },
    buildQueryOptions: (_params, dbConfig) => ({ database: dbConfig.database }),
    postProcess: (response, params) => {
        injectSymbol(response, params.network, false);
    },
});

route.get('/', openapi, validator('query', querySchema, validatorHook), handler);

export default route;
