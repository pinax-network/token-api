import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { stables } from '../../../../inject/prices.tokens.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    evmContractSchema,
    evmNetworkIdSchema,
    intervalSchema,
    timestampSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

    contract: { schema: evmContractSchema },
    interval: { schema: intervalSchema, prefault: '1d' },
    start_time: { schema: timestampSchema, prefault: '2025-01-01' },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            datetime: z.string().describe('ISO 8601 datetime string'),
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
        summary: 'Token Prices (USD)',
        description:
            'Returns OHLCV price data in USD for tokens.\n\nOHLCV historical depth is subject to plan restrictions.',
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

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.uniswapDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
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
});

export default route;
