import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    svmNetworkIdSchema,
    svmOwnerSchema,
    svmTokenAccountSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    account: { schema: svmTokenAccountSchema, batched: true },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            last_update: dateTimeSchema,
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

            // -- contract --
            account: svmTokenAccountSchema,
            owner: svmOwnerSchema,
            is_closed: z.boolean(),

            // -- chain --
            network: svmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Account Owner Lookup',
        description: 'Returns owner address of an associated token account (ATA) with closure status.',

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
                                            last_update: '2025-07-14 17:17:19',
                                            last_update_block_num: 353288878,
                                            last_update_timestamp: 1752513439,
                                            account: '5UZfa66rzeDpD9wKs3Sn3iewmavxYvpAtiF2Lqd2n1wW',
                                            owner: 'GXYBNgyYKbSLr938VJCpmGLCUaAHWsncTi7jDoQSdFR9',
                                            is_closed: false,
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
    const query = sqlQueries.owner_for_account?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for holders could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
