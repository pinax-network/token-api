import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { stables } from '../../../../../inject/prices.tokens.js';
import { TVM_POOL_USDT_WTRX_EXAMPLE } from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    intervalSchema,
    timestampSchema,
    tvmNetworkIdSchema,
    tvmPoolSchema,
} from '../../../../../types/zod.js';
import { getDateMinusMonths, validatorHook, withErrorResponses } from '../../../../../utils.js';
import { dexController } from '../../../../../application/container.js';

const querySchema = createQuerySchema({
    network: { schema: tvmNetworkIdSchema },

    pool: { schema: tvmPoolSchema, meta: { example: TVM_POOL_USDT_WTRX_EXAMPLE } },
    interval: { schema: intervalSchema, prefault: '1d' },
    start_time: { schema: timestampSchema, prefault: getDateMinusMonths(1) },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            datetime: dateTimeSchema,
            ticker: z.string(),
            pool: tvmPoolSchema,
            open: z.number(),
            high: z.number(),
            low: z.number(),
            close: z.number(),
            volume: z.number(),
            uaw: z.number(),
            transactions: z.number(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Pool OHLCV Data',
        description:
            'Returns OHLCV price data for liquidity pools.\n\nOHLCV historical depth is subject to plan restrictions.',
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
                                            datetime: '2025-11-05 00:00:00',
                                            ticker: 'WTRXUSDT',
                                            pool: 'TFGDbUyP8xez44C76fin3bn3Ss6jugoUwJ',
                                            open: 0.2858162052159799,
                                            high: 0.2880636266155062,
                                            low: 0.28099080983643465,
                                            close: 0.2880636266155062,
                                            volume: 15584135805763,
                                            uaw: 10,
                                            transactions: 102081,
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

const handler = dexController.createHandler({
    schema: querySchema,
    query: { key: 'ohlcv_prices_for_pool', errorMessage: 'Query for OHLC pool data could not be loaded' },
    transformParams: (params) => ({
        ...params,
        high_quantile: 1 - config.ohlcQuantile,
        low_quantile: config.ohlcQuantile,
        stablecoin_contracts: [...stables],
        db_tvm_tokens: config.tokenDatabases[params.network]?.database ?? '',
    }),
    buildQueryOptions: (_params, dbConfig) => ({ database: dbConfig.database }),
});

route.get('/', openapi, validator('query', querySchema, validatorHook), handler);

export default route;
