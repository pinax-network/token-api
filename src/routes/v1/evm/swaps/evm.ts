import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    EVM_ADDRESS_SWAP_EXAMPLE,
    EVM_POOL_USDC_WETH_EXAMPLE,
    EVM_TRANSACTION_SWAP_EXAMPLE,
} from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    dateTimeSchema,
    evmAddressSchema,
    evmFactorySchema,
    evmNetworkIdSchema,
    evmPoolSchema,
    evmProtocolSchema,
    evmTokenResponseSchema,
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
        meta: { example: EVM_TRANSACTION_SWAP_EXAMPLE },
    },
    pool: { schema: evmPoolSchema, batched: true, default: '', meta: { example: EVM_POOL_USDC_WETH_EXAMPLE } },
    caller: { schema: evmAddressSchema, batched: true, default: '', meta: { example: EVM_ADDRESS_SWAP_EXAMPLE } },
    sender: { schema: evmAddressSchema, batched: true, default: '', meta: { example: EVM_ADDRESS_SWAP_EXAMPLE } },
    recipient: { schema: evmAddressSchema, batched: true, default: '', meta: { example: EVM_ADDRESS_SWAP_EXAMPLE } },
    protocol: { schema: evmProtocolSchema, default: '' },

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
            factory: evmFactorySchema,
            pool: evmPoolSchema,
            input_token: evmTokenResponseSchema,
            output_token: evmTokenResponseSchema,

            caller: evmAddressSchema,
            sender: evmAddressSchema,
            recipient: evmAddressSchema,

            input_amount: z.string(),
            input_value: z.number(),
            output_amount: z.string(),
            output_value: z.number(),
            price: z.number(),
            price_inv: z.number(),
            protocol: evmProtocolSchema,
            summary: z.string(),

            // -- chain --
            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Swap Events',
        description: 'Returns DEX swap transactions from Uniswap protocols with token amounts and prices.',

        tags: ['EVM DEXs'],
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
                                            block_num: 23590326,
                                            datetime: '2025-10-16 12:48:47',
                                            timestamp: 1760618927,
                                            transaction_id:
                                                '0xf6374799c227c9db38ff5ac1d5bebe8b607a1de1238cd861ebd1053ec07305ca',
                                            factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
                                            pool: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
                                            input_token: {
                                                address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                                                symbol: 'USDC',
                                                decimals: 6,
                                            },
                                            output_token: {
                                                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                                                symbol: 'WETH',
                                                decimals: 18,
                                            },
                                            caller: '0xa69babef1ca67a37ffaf7a485dfff3382056e78c',
                                            sender: '0xa69babef1ca67a37ffaf7a485dfff3382056e78c',
                                            recipient: '0xa69babef1ca67a37ffaf7a485dfff3382056e78c',
                                            input_amount: '40735537734',
                                            input_value: 40735.537734,
                                            output_amount: '10042247631260591234',
                                            output_value: 10.042247631260592,
                                            price: 246517483.4798306,
                                            price_inv: 4.0565074163667475e-9,
                                            protocol: 'uniswap_v3',
                                            summary:
                                                'Swap 40.74 thousand USDC for 10.042247631260592 WETH on Uniswap V3',
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

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
