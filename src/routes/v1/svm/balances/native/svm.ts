import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { sqlQueries } from '../../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    includeNullBalancesSchema,
    svmAddressSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmSPLTokenProgramIdSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    address: { schema: svmAddressSchema, batched: true },
    include_null_balances: { schema: includeNullBalancesSchema, default: false },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            last_update: dateTimeSchema,
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

            // -- transaction --
            // signature: z.string(),

            // -- instruction --
            program_id: svmSPLTokenProgramIdSchema,

            // -- balance --
            address: svmAddressSchema,
            mint: svmMintSchema,

            amount: z.string(),
            value: z.number(),
            decimals: z.number().nullable(),

            name: z.string().nullable(),
            symbol: z.string().nullable(),
            uri: z.string().nullable(),

            // -- network --
            network: svmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Native Balances',
        description: 'Returns SOL native balances for wallet addresses.',

        tags: ['SVM Tokens'],
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
                                            last_update: '2025-10-16 08:20:15',
                                            last_update_block_num: 373711220,
                                            last_update_timestamp: 1760602815,
                                            program_id: '11111111111111111111111111111111',
                                            address: 'So11111111111111111111111111111111111111112',
                                            mint: 'So11111111111111111111111111111111111111111',
                                            amount: '1173096711863',
                                            value: 1173.096711863,
                                            decimals: 9,
                                            name: 'SOL',
                                            symbol: 'SOL',
                                            uri: null,
                                            network: 'solana',
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.tokenDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.native_balances_for_account?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
