import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { stables } from '../../../../../inject/prices.tokens.js';
import { sqlQueries } from '../../../../../sql/index.js';
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
            network: tvmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Pool OHLCV',
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

    const dbDex = config.dexDatabases[params.network];
    const dbMetadata = config.metadataDatabases[params.network];

    if (!dbDex || !dbMetadata) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }

    const query = sqlQueries.ohlcv_prices_for_pool?.[dbDex.type];
    if (!query) return c.json({ error: 'Query for OHLC pool data could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], {
        ...params,
        stablecoin_contracts: [...stables],
        db_dex: dbDex.database,
        db_metadata: dbMetadata.database,
    });
    return handleUsageQueryError(c, response);
});

export default route;
