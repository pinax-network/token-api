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
    endTimeSchema,
    intervalSchema,
    paginationQuery,
    SVM_networkIdSchema,
    startTimeSchema,
    USDC_WSOL,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const paramSchema = z.object({
    pool: USDC_WSOL,
});

const querySchema = z
    .object({
        network_id: SVM_networkIdSchema,
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
        summary: 'Solana OHLCV prices by Pool',
        description: 'Provides pricing data in the Open/High/Low/Close/Volume (OHCLV) format for DEX pools.',
        tags: ['SVM'],
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
                                            datetime: '2025-09-15 00:00:00',
                                            amm: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
                                            pool: 'AmmpSnW5xVeKHTAU9fMjyKEMPgrzmUj3ah5vgvHhAB5J',
                                            token0: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
                                            token0_decimals: 6,
                                            token1: 'So11111111111111111111111111111111111111112',
                                            token1_decimals: 9,
                                            open: 0.003648785031942177,
                                            high: 0.0036724218787403977,
                                            low: 0.0034598947533987442,
                                            close: 0.0035191405556241413,
                                            volume: 3.521022449,
                                            uaw: 76,
                                            transactions: 159,
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
        let query = sqlQueries.ohlcv_prices_for_pool?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for OHLC pool data could not be loaded' }, 500);

        query = query.replaceAll('{svm_metadata_db}', config.tokenDatabases[params.network_id]?.database || '');
        const response = await makeUsageQueryJson(
            c,
            [query],
            {
                ...params,
                high_quantile: 0.95,
                low_quantile: 0.05,
                stablecoin_contracts: [...stables],
            },
            { database: dbConfig.database }
        );
        return handleUsageQueryError(c, response);
    }
);

export default route;
