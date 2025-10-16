import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { injectSymbol } from '../../../../inject/symbol.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    EVM_ADDRESS_TO_EXAMPLE,
    EVM_CONTRACT_NATIVE_EXAMPLE,
    EVM_TRANSACTION_TRANSFER_EXAMPLE,
} from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    evmTransactionSchema,
    timestampSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

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

    start_time: { schema: timestampSchema, prefault: '2025-01-01' },
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

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const dbConfig = config.tokenDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.transfers?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for transfers could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    injectSymbol(response, params.network, false);

    return handleUsageQueryError(c, response);
});

export default route;
