import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { injectSymbol } from '../../../../inject/symbol.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    TVM_ADDRESS_FROM_EXAMPLE,
    TVM_ADDRESS_TO_EXAMPLE,
    TVM_CONTRACT_USDT_EXAMPLE,
    TVM_TRANSACTION_TRC20_TRANSFER_EXAMPLE,
} from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    dateTimeSchema,
    timestampSchema,
    tvmAddressSchema,
    tvmContractSchema,
    tvmNetworkIdSchema,
    tvmTransactionSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },

    transaction_id: {
        schema: tvmTransactionSchema,
        batched: true,
        default: '',
        meta: { example: TVM_TRANSACTION_TRC20_TRANSFER_EXAMPLE },
    },
    contract: { schema: tvmContractSchema, batched: true, default: '', meta: { example: TVM_CONTRACT_USDT_EXAMPLE } },
    // address: { schema: tvmAddressSchema, batched: true, default: '' },
    from_address: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_ADDRESS_FROM_EXAMPLE } },
    to_address: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_ADDRESS_TO_EXAMPLE } },

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

            // -- log --
            log_index: z.number(),
            log_ordinal: z.number(),

            // -- transfer --
            contract: tvmContractSchema,
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
        summary: 'TRC-20 Transfers',
        description: 'Returns TRC-20 transfers with transaction and block data.',
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
                                            block_num: 77231165,
                                            datetime: '2025-11-05 14:57:51',
                                            timestamp: 1762354671,
                                            transaction_id:
                                                '46c608cd66c873753f7d86a3dc6b46453052505730cc5f6e951533083b1d40ab',
                                            transaction_index: 273,
                                            log_index: 0,
                                            log_ordinal: 1020,
                                            contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                                            from: 'TAYtGZzxZf1GhPfGwZKskWQnz7Qj3rwLDh',
                                            to: 'THWuviP5wEiPBLZ1g1iPPiH4kV7FRXWFP1',
                                            amount: '19600000000',
                                            value: 19600,
                                            name: 'Tether USD',
                                            symbol: 'USDT',
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbTransfers = config.transfersDatabases[params.network];
    const dbMetadata = config.metadataDatabases[params.network];

    if (!dbTransfers || !dbMetadata) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.transfers?.[dbTransfers.type];
    if (!query) return c.json({ error: 'Query for transfers could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], {
        ...params,
        db_transfers: dbTransfers.database,
        db_metadata: dbMetadata.database,
    });
    injectSymbol(response, params.network, false);

    return handleUsageQueryError(c, response);
});

export default route;
