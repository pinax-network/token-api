import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponse,
    filterByOwner,
    PumpFunMetadataName,
    PumpFunMetadataSymbol,
    PumpFunMetadataUri,
    paginationQuery,
    SVM_networkIdSchema,
    svmAddressSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = z
    .object({
        network_id: SVM_networkIdSchema,
        address: filterByOwner.unwrap(),
    })
    .extend(paginationQuery.shape);

const responseSchema = apiUsageResponse.extend({
    data: z.array(
        z.object({
            // -- block --
            last_update: z.string(),
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

            // -- transaction --
            // signature: z.string(),

            // -- instruction --
            program_id: svmAddressSchema,

            // -- balance --
            address: svmAddressSchema,
            mint: svmAddressSchema,
            amount: z.string(),
            value: z.number(),
            decimals: z.number(),

            name: PumpFunMetadataName,
            symbol: PumpFunMetadataSymbol,
            uri: PumpFunMetadataUri,

            // -- network --
            network_id: SVM_networkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Solana Native Balances',
        description: 'Returns SOL native balances for wallet addresses.',

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
                                            last_update: '2025-09-10 00:12:02',
                                            last_update_block_num: 365784894,
                                            last_update_timestamp: 1757463122,
                                            program_id: '11111111111111111111111111111111',
                                            address: 'GXYBNgyYKbSLr938VJCpmGLCUaAHWsncTi7jDoQSdFR9',
                                            mint: 'So11111111111111111111111111111111111111111',
                                            amount: '7769223380',
                                            value: 7.76922338,
                                            decimals: 9,
                                            name: 'SOL',
                                            symbol: 'SOL',
                                            uri: null,
                                            network_id: 'solana',
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

    const dbConfig = config.tokenDatabases[params.network_id];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network_id}` }, 400);
    }
    const query = sqlQueries.native_balances_for_account?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
