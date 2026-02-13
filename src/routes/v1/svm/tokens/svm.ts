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
    svmMintSchema,
    svmNetworkIdSchema,
    svmSPLTokenProgramIdSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';
import { injectIcons } from '../../../../inject/icon.js';

const querySchema = createQuerySchema(
    {
        network: { schema: svmNetworkIdSchema },
        mint: { schema: svmMintSchema, batched: true },
    },
    false
);

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            last_update: dateTimeSchema,
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

            program_id: svmSPLTokenProgramIdSchema,
            mint: svmMintSchema,
            decimals: z.number().nullable(),

            circulating_supply: z.number(),
            // total_supply: z.number(),
            holders: z.number(),

            name: z.string().nullable(),
            symbol: z.string().nullable(),
            uri: z.string().nullable(),

            network: z.string(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Metadata',
        description: 'Provides SVM token contract metadata.',
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
                                            last_update: '2026-02-13 19:51:23',
                                            last_update_block_num: 400052757,
                                            last_update_timestamp: 1771012283,
                                            program_id: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
                                            mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
                                            circulating_supply: 1008838089998.1345,
                                            holders: 139755,
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

    const dbBalances = config.balancesDatabases[params.network];

    if (!dbBalances) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.tokens_for_contract?.[dbBalances.type];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(
        c,
        [query],
        {
            ...params,
            db_balances: dbBalances.database,
            db_metadata: dbBalances.database,
        },
        {
            clickhouse_settings: { query_cache_ttl: config.cacheDurations[1] },
        }
    );
    injectIcons(response);
    return handleUsageQueryError(c, response);
});

export default route;
