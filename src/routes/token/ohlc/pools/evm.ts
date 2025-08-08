import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { stables } from '../../../../inject/prices.tokens.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponse,
    EVM_networkIdSchema,
    endTimeSchema,
    intervalSchema,
    paginationQuery,
    startTimeSchema,
    USDC_WETH,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const paramSchema = z.object({
    pool: USDC_WETH,
});

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        interval: intervalSchema.optional(),
        startTime: startTimeSchema.optional(),
        endTime: endTimeSchema.optional(),
    })
    .extend(paginationQuery.shape);

const responseSchema = apiUsageResponse.extend({
    data: z.array(
        z.object({
            datetime: z.iso.datetime(),
            ticker: z.string(),
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
        description: 'Returns candlestick price data for liquidity pools across time intervals.',

        tags: ['EVM'],
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
                                            datetime: '2025-05-29 15:00:00',
                                            ticker: 'WETHUSDC',
                                            open: 2674.206768283323,
                                            high: 2674.206768283323,
                                            low: 2648.1288363948797,
                                            close: 2648.1288363948797,
                                            volume: 5062048.294222999,
                                            transactions: 169,
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

route.get(
    '/:pool',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.uniswapDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
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
    }
);

export default route;
