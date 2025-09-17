import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { injectSymbol } from '../../../../inject/symbol.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponse,
    EVM_networkIdSchema,
    endTimeSchema,
    evmAddressSchema,
    intervalSchema,
    paginationQuery,
    startTimeSchema,
    Vitalik,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const paramSchema = z.object({
    address: Vitalik,
});

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        interval: intervalSchema.optional(),
        contracts: evmAddressSchema.array().default([]).optional(),
        startTime: startTimeSchema.optional(),
        endTime: endTimeSchema.optional(),
    })
    .extend(paginationQuery.shape);

const responseSchema = apiUsageResponse.extend({
    data: z.array(
        z.object({
            datetime: z.iso.datetime(),
            contract: z.string(),
            name: z.string(),
            symbol: z.string(),
            decimals: z.number(),
            open: z.number(),
            high: z.number(),
            low: z.number(),
            close: z.number(),
            // -- network --
            network_id: EVM_networkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Historical Balances',
        description: 'Returns wallet token balance changes over time in OHLC format.',
        tags: ['EVM'],
        'x-tagGroups': ['Historical'],
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
                                            datetime: '2025-09-11 00:00:00',
                                            contract: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                            name: 'Ethereum',
                                            symbol: 'ETH',
                                            decimals: 18,
                                            open: 2370757.8393482137,
                                            high: 2430544.3576619215,
                                            low: 2370757.8393482137,
                                            close: 2420472.251720042,
                                            network_id: 'mainnet',
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
    '/:address',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.tokenDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        const query = sqlQueries.historical_balances_for_account?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for historical balances could not be loaded' }, 500);

        const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
        injectSymbol(response, params.network_id, true);

        return handleUsageQueryError(c, response);
    }
);

export default route;
