import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { stables } from '../../../../inject/prices.tokens.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    EVM_networkIdSchema,
    endTimeSchema,
    intervalSchema,
    paginationQuery,
    startTimeSchema,
    statisticsSchema,
    WETH,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const paramSchema = z.object({
    contract: WETH,
});

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        interval: intervalSchema,
        startTime: startTimeSchema,
        endTime: endTimeSchema,
    })
    .extend(paginationQuery.shape);

const responseSchema = z.object({
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
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'OHLCV by Contract',
        description: 'Provides pricing data in the Open/High/Low/Close/Volume (OHCLV) format.',
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
                                            ticker: 'WETHUSD',
                                            open: 2669.130852861705,
                                            high: 2669.130852861705,
                                            low: 2669.130852861705,
                                            close: 2669.130852861705,
                                            volume: 184897.1695477702,
                                            uaw: 31,
                                            transactions: 35,
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
    '/:contract',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.uniswapDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        const query = sqlQueries.ohlcv_prices_usd_for_contract?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for OHLC price data could not be loaded' }, 500);

        const response = await makeUsageQueryJson(
            c,
            [query],
            { ...params, stablecoin_contracts: [...stables] },
            { database: dbConfig.database }
        );
        return handleUsageQueryError(c, response);
    }
);

export default route;
