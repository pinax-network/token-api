import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    TVM_CONTRACT_USDT_EXAMPLE,
    TVM_CONTRACT_WTRX_EXAMPLE,
    TVM_FACTORY_SUNSWAP_EXAMPLE,
    TVM_POOL_USDT_WTRX_EXAMPLE,
} from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    evmFactorySchema,
    evmNetworkIdSchema,
    evmPoolSchema,
    evmProtocolSchema,
    evmTokenResponseSchema,
    tvmContractSchema,
    tvmFactorySchema,
    tvmNetworkIdSchema,
    tvmPoolSchema,
    tvmProtocolSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },

    factory: {
        schema: tvmFactorySchema,
        batched: true,
        default: '',
        meta: { example: TVM_FACTORY_SUNSWAP_EXAMPLE },
    },
    pool: { schema: tvmPoolSchema, batched: true, default: '', meta: { example: TVM_POOL_USDT_WTRX_EXAMPLE } },
    input_token: {
        schema: tvmContractSchema,
        batched: true,
        default: '',
        meta: { example: TVM_CONTRACT_USDT_EXAMPLE },
    },
    output_token: {
        schema: tvmContractSchema,
        batched: true,
        default: '',
        meta: { example: TVM_CONTRACT_WTRX_EXAMPLE },
    },
    protocol: { schema: tvmProtocolSchema, default: '' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            // block_num: z.number(),
            // datetime: dateTimeSchema,

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
        description: 'Returns DEX pool metadata including tokens, fees and protocol.',
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
                                            pool: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
                                            factory: 'TXk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF',
                                            protocol: 'uniswap_v1',
                                            input_token: {
                                                address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
                                                symbol: 'TRX',
                                                decimals: 6,
                                            },
                                            output_token: {
                                                address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                                                symbol: 'USDT',
                                                decimals: 6,
                                            },
                                            fee: 3000,
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

    const dbConfig = config.dexDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.pools?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for pools could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
