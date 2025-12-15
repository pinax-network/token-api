import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { stables } from '../../../../../inject/prices.tokens.js';
import { sqlQueries } from '../../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    intervalSchema,
    svmAmmPoolSchema,
    svmAmmSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    timestampSchema,
} from '../../../../../types/zod.js';
import { getDateMinusMonths, validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    amm_pool: { schema: svmAmmPoolSchema },

    interval: { schema: intervalSchema, prefault: '1d' },
    start_time: { schema: timestampSchema, prefault: getDateMinusMonths(1) },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            datetime: dateTimeSchema,
            amm: svmAmmSchema,
            amm_pool: svmAmmPoolSchema,
            token0: svmMintSchema,
            token0_decimals: z.number().nullable(),
            token1: svmMintSchema,
            token1_decimals: z.number().nullable(),
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
        description: 'Provides pricing data in the Open/High/Low/Close/Volume (OHCLV) format for DEX pools.',
        tags: ['SVM DEXs'],
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
                                            amm: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
                                            amm_pool: 'AmmpSnW5xVeKHTAU9fMjyKEMPgrzmUj3ah5vgvHhAB5J',
                                            token0: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
                                            token0_decimals: 6,
                                            token1: 'So11111111111111111111111111111111111111112',
                                            token1_decimals: 9,
                                            open: 0.0020385820805914096,
                                            high: 0.002037622484039942,
                                            low: 0.002029088299722426,
                                            close: 0.0020285665581652053,
                                            volume: 0.14567917800000002,
                                            uaw: 8,
                                            transactions: 8,
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
    // this DB is used to fetch token metadata (symbol, name, decimals)
    const db_svm_tokens = config.tokenDatabases[params.network];

    if (!dbConfig || !db_svm_tokens) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }

    const query = sqlQueries.ohlcv_prices_for_pool?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for OHLC pool data could not be loaded' }, 500);

    const response = await makeUsageQueryJson(
        c,
        [query],
        {
            ...params,
            stablecoin_contracts: [...stables],
            db_svm_tokens: db_svm_tokens.database,
        },
        { database: dbConfig.database }
    );
    return handleUsageQueryError(c, response);
});

export default route;
