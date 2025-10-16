import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { injectSymbol } from '../../../../../inject/symbol.js';
import { sqlQueries } from '../../../../../sql/index.js';
import { EVM_CONTRACT_NATIVE_EXAMPLE } from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    intervalSchema,
    timestampSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    address: { schema: evmAddressSchema },
    contract: { schema: evmContractSchema, batched: true, default: '', meta: { example: EVM_CONTRACT_NATIVE_EXAMPLE } },
    interval: { schema: intervalSchema, prefault: '1d', meta: { example: '1w' } },
    start_time: { schema: timestampSchema, prefault: '2025-01-01' },
    end_time: { schema: timestampSchema, default: 9999999999 },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            datetime: z.iso.datetime(),
            address: evmAddressSchema,
            contract: evmContractSchema,
            decimals: z.number(),
            open: z.number(),
            high: z.number(),
            low: z.number(),
            close: z.number(),
            name: z.string(),
            symbol: z.string(),
            // -- network --
            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Historical Balances',
        description:
            'Returns wallet token balance changes over time in OHLCV format.\n\nOHLCV historical depth is subject to plan restrictions.',
        tags: ['EVM Tokens'],
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
                                            datetime: '2025-10-09 00:00:00',
                                            address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
                                            contract: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                            open: 29.589346973619755,
                                            high: 50.783103394640676,
                                            low: 0.7830483276016842,
                                            close: 0.7841551025245886,
                                            name: 'Native',
                                            symbol: 'ETH',
                                            decimals: 18,
                                            network: 'mainnet',
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
    const params = c.get('validatedData');

    const dbConfig = config.tokenDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.historical_balances_for_account?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for historical balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    injectSymbol(response, params.network, true);

    return handleUsageQueryError(c, response);
});

export default route;
