import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { stables } from '../../../../../inject/prices.tokens.js';
import { sqlQueries } from '../../../../../sql/index.js';
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.uniswapDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.ohlcv_prices_for_pool?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for OHLC pool data could not be loaded' }, 500);

    const response = await makeUsageQueryJson(
        c,
        [query],
        {
            ...params,
            high_quantile: 1 - config.ohlcQuantile,
            low_quantile: config.ohlcQuantile,
            stablecoin_contracts: [...stables],
        },
        { database: dbConfig.database }
    );
    return handleUsageQueryError(c, response);
});

export default route;
