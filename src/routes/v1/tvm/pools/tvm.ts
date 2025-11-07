import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    EVM_CONTRACT_USDC_EXAMPLE,
    EVM_CONTRACT_WETH_EXAMPLE,
    EVM_FACTORY_UNISWAP_V3_EXAMPLE,
    EVM_POOL_USDC_WETH_EXAMPLE,
} from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    evmContractSchema,
    evmFactorySchema,
    evmNetworkIdSchema,
    evmPoolSchema,
    evmProtocolSchema,
    evmTokenResponseSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

    factory: {
        schema: evmFactorySchema,
        batched: true,
        default: '',
        meta: { example: EVM_FACTORY_UNISWAP_V3_EXAMPLE },
    },
    pool: { schema: evmPoolSchema, batched: true, default: '', meta: { example: EVM_POOL_USDC_WETH_EXAMPLE } },
    input_token: {
        schema: evmContractSchema,
        batched: true,
        default: '',
        meta: { example: EVM_CONTRACT_USDC_EXAMPLE },
    },
    output_token: {
        schema: evmContractSchema,
        batched: true,
        default: '',
        meta: { example: EVM_CONTRACT_WETH_EXAMPLE },
    },
    protocol: { schema: evmProtocolSchema, default: '' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            // block_num: z.number(),
            // datetime: z.string().describe('ISO 8601 datetime string'),

            // -- transaction --
            // transaction_id: z.string(),

            // -- pool --
            factory: evmFactorySchema,
            pool: evmPoolSchema,
            input_token: evmTokenResponseSchema,
            output_token: evmTokenResponseSchema,
            fee: z.number(),
            protocol: evmProtocolSchema,

            // -- chain --
            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Liquidity Pools',
        description: 'Returns Uniswap liquidity pool metadata including token pairs, fees, and protocol versions.',

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
                                            fee: 500,
                                            protocol: 'uniswap_v3',
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

    const dbConfig = config.uniswapDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.pools?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for pools could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
