import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { stables } from '../../../../../inject/prices.tokens.js';
import { EVM_POOL_USDC_WETH_EXAMPLE } from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    evmNetworkIdSchema,
    evmPoolSchema,
    intervalSchema,
    timestampSchema,
} from '../../../../../types/zod.js';
import { getDateMinusMonths, validatorHook, withErrorResponses } from '../../../../../utils.js';
import { dexController } from '../../../../../application/container.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

    pool: { schema: evmPoolSchema, meta: { example: EVM_POOL_USDC_WETH_EXAMPLE } },
    interval: { schema: intervalSchema, prefault: '1d' },
    start_time: { schema: timestampSchema, prefault: getDateMinusMonths(1) },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            datetime: dateTimeSchema,
            ticker: z.string(),
            pool: evmPoolSchema,
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
                                            datetime: '2025-10-16 00:00:00',
                                            ticker: 'USDCWETH',
                                            pool: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
                                            open: 3986.8562193110524,
                                            high: 4067.092237083535,
                                            low: 3959.52075942394,
                                            close: 3989.7646037044765,
                                            volume: 32956701.586648002,
                                            uaw: 1363,
                                            transactions: 3066,
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
    }),
    buildQueryOptions: (_params, dbConfig) => ({ database: dbConfig.database }),
});

route.get('/', openapi, validator('query', querySchema, validatorHook), handler);

export default route;
