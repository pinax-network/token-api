import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { injectSymbol } from '../../../../../inject/symbol.js';
import { sqlQueries } from '../../../../../sql/index.js';
import { EVM_ADDRESS_TO_EXAMPLE, EVM_TRANSACTION_TRANSFER_EXAMPLE } from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    dateTimeSchema,
    evmAddressSchema,
    evmNetworkIdSchema,
    evmTransactionSchema,
    timestampSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

    transaction_id: {
        schema: evmTransactionSchema,
        batched: true,
        default: '',
        meta: { example: EVM_TRANSACTION_TRANSFER_EXAMPLE },
    },
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
            transaction_index: z.number(),

            // -- transfer --
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
        summary: 'Native Transfers',
        description: 'Returns Native token transfers with transaction and block data.',
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
                                            block_num: 23941301,
                                            datetime: '2025-12-04 17:59:59',
                                            timestamp: 1764871199,
                                            transaction_id:
                                                '0x1a153e6344384dbfcf0d3137f438372a1fe03f2369a4c90e644bf0dcb9b20eba',
                                            transaction_index: 77,
                                            from: '0x396343362be2a4da1ce0c1c210945346fb82aa49',
                                            to: '0x388c818ca8b9251b393131c08a736a67ccb19297',
                                            amount: '67280623582677016',
                                            value: 0.06728062358267702,
                                            name: 'Ethereum',
                                            symbol: 'ETH',
                                            decimals: 18,
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

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.evmTransfersDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.transfers_native?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for transfers could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    injectSymbol(response, params.network, false);

    return handleUsageQueryError(c, response);
});

export default route;
