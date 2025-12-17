import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    TVM_ADDRESS_SWAP_EXAMPLE,
    TVM_CONTRACT_USDT_EXAMPLE,
    TVM_CONTRACT_WTRX_EXAMPLE,
    TVM_FACTORY_SUNSWAP_EXAMPLE,
    TVM_POOL_USDT_WTRX_EXAMPLE,
    TVM_TRANSACTION_SWAP_EXAMPLE,
} from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    dateTimeSchema,
    timestampSchema,
    tvmAddressSchema,
    tvmFactorySchema,
    tvmNetworkIdSchema,
    tvmPoolSchema,
    tvmProtocolSchema,
    tvmTokenResponseSchema,
    tvmTransactionSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },

    // transaction
    transaction_id: {
        schema: tvmTransactionSchema,
        batched: true,
        default: '',
        meta: { example: TVM_TRANSACTION_SWAP_EXAMPLE },
    },

    // swaps
    factory: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_FACTORY_SUNSWAP_EXAMPLE } },
    pool: { schema: tvmPoolSchema, batched: true, default: '', meta: { example: TVM_POOL_USDT_WTRX_EXAMPLE } },
    caller: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_ADDRESS_SWAP_EXAMPLE } },
    sender: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_ADDRESS_SWAP_EXAMPLE } },
    recipient: { schema: tvmAddressSchema, batched: true, default: '', meta: { example: TVM_ADDRESS_SWAP_EXAMPLE } },
    input_contract: {
        schema: tvmAddressSchema,
        batched: true,
        default: '',
        meta: { example: TVM_CONTRACT_USDT_EXAMPLE },
    },
    output_contract: {
        schema: tvmAddressSchema,
        batched: true,
        default: '',
        meta: { example: TVM_CONTRACT_WTRX_EXAMPLE },
    },
    protocol: { schema: tvmProtocolSchema, default: '' },

    // time and block range
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

            // -- swap --
            transaction_id: z.string(),
            factory: tvmFactorySchema,
            pool: tvmPoolSchema,
            input_token: tvmTokenResponseSchema,
            output_token: tvmTokenResponseSchema,

            caller: tvmAddressSchema,
            sender: tvmAddressSchema,
            recipient: tvmAddressSchema,

            // -- log --
            // ordinal: z.number(),

            // -- price --
            input_amount: z.string(),
            input_value: z.number(),
            output_amount: z.string(),
            output_value: z.number(),
            price: z.number(),
            price_inv: z.number(),
            protocol: tvmProtocolSchema,
            summary: z.string(),

            // -- chain --
            network: tvmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Swap Events',
        description: 'Returns DEX swaps events with input & output token amounts.',

        tags: ['TVM DEXs'],
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
                                            block_num: 28320009,
                                            datetime: '2021-03-10 04:43:33',
                                            timestamp: 1615351413,
                                            transaction_id:
                                                '0x3e0f39b48dae8c49d3f95bc6206a632af484059764487b0c7d3e3c97bb433130',
                                            factory: 'TXk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF',
                                            pool: 'TAqCH2kadHAugPEorFrpT7Kogqo2FckxWA',
                                            caller: 'TSLjVj4sL7uDWQXDbHyV3Kbgz1KL9jB78w',
                                            sender: 'TSLjVj4sL7uDWQXDbHyV3Kbgz1KL9jB78w',
                                            recipient: 'TSLjVj4sL7uDWQXDbHyV3Kbgz1KL9jB78w',
                                            input_token: {
                                                address: 'TGc9XV7skLENAHPj4afCpBS8JSHv6box9C',
                                                symbol: '',
                                                decimals: 0,
                                            },
                                            output_token: {
                                                address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
                                                symbol: 'TRX',
                                                decimals: 6,
                                            },
                                            input_amount: '20000000',
                                            input_value: 20000000,
                                            output_amount: '1258054968',
                                            output_value: 1258.054968,
                                            price: 0.0000629027484,
                                            price_inv: 15897.556552552798,
                                            protocol: 'uniswap_v1',
                                            summary: 'Swap 20.00 million  for 1.26 thousand TRX on Uniswap V1',
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

    const dbConfig = config.uniswapDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }

    const query = sqlQueries.swaps?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for swaps could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { ...params }, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
