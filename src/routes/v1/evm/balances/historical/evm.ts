import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { injectSymbol } from '../../../../../inject/symbol.js';
import { sqlQueries } from '../../../../../sql/index.js';
import { EVM_CONTRACT_USDT_EXAMPLE } from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    intervalSchema,
    timestampSchema,
} from '../../../../../types/zod.js';
import { getDateMinusMonths, validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    address: { schema: evmAddressSchema },
    contract: { schema: evmContractSchema, batched: true, default: '', meta: { example: EVM_CONTRACT_USDT_EXAMPLE } },
    interval: { schema: intervalSchema, prefault: '1d', meta: { example: '1d' } },
    start_time: { schema: timestampSchema, prefault: getDateMinusMonths(1) },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            datetime: dateTimeSchema,
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
            'Returns wallet ERC-20 token balance changes over time in OHLCV format.\n\nOHLCV historical depth is subject to plan restrictions.',
        tags: ['EVM Tokens (ERC-20)'],
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
                                            datetime: '2026-01-09 00:00:00',
                                            address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
                                            contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
                                            open: 269.18034,
                                            high: 269.18034,
                                            low: 269.18034,
                                            close: 269.18034,
                                            name: 'Tether USD',
                                            symbol: 'USDT',
                                            decimals: 6,
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbBalances = config.balancesDatabases[params.network];
    const dbMetadata = config.metadataDatabases[params.network];

    if (!dbBalances || !dbMetadata) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.historical_balances_for_account?.[dbBalances.type];
    if (!query) return c.json({ error: 'Query for historical balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], {
        ...params,
        db_balances: dbBalances.database,
        db_metadata: dbMetadata.database,
    });
    injectSymbol(response, params.network, true);

    return handleUsageQueryError(c, response);
});

export default route;
