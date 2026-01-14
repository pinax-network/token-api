import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    includeNullBalancesSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmOwnerSchema,
    svmSPLTokenProgramIdSchema,
    svmTokenAccountSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    owner: { schema: svmOwnerSchema, batched: true },
    token_account: { schema: svmTokenAccountSchema, batched: true, default: '' },
    mint: { schema: svmMintSchema, batched: true, default: '' },
    program_id: { schema: svmSPLTokenProgramIdSchema, default: '' },
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
            owner: svmOwnerSchema,
            token_account: svmTokenAccountSchema,
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
        summary: 'Token Balances',
        description: 'Returns SPL token balances for Solana token owners with mint and program data.',

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
                                            last_update: '2025-10-09 02:10:01',
                                            last_update_block_num: 372132067,
                                            last_update_timestamp: 1759975801,
                                            program_id: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
                                            owner: 'GXYBNgyYKbSLr938VJCpmGLCUaAHWsncTi7jDoQSdFR9',
                                            token_account: '5UZfa66rzeDpD9wKs3Sn3iewmavxYvpAtiF2Lqd2n1wW',
                                            mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
                                            amount: '85605114004',
                                            value: 85605.114004,
                                            decimals: 6,
                                            name: 'Pump',
                                            symbol: 'PUMP',
                                            uri: 'https://ipfs.io/ipfs/bafkreibcglldkfdekdkxgumlveoe6qv3pbiceypkwtli33clbzul7leo4m',
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.balancesDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.balances_for_account?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
