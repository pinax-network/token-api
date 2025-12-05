import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import { SVM_MINT_WSOL_EXAMPLE } from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    svmAddressSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmProgramIdSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },
    mint: { schema: svmMintSchema, meta: { example: SVM_MINT_WSOL_EXAMPLE } },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            last_update: dateTimeSchema,
            last_update_block_num: z.number(),
            last_update_timestamp: z.number(),

            // -- contract --
            owner: svmAddressSchema,
            mint: svmMintSchema,
            program_id: svmProgramIdSchema,
            amount: z.string(),
            value: z.number(),

            // -- contract --
            decimals: z.number().nullable(),
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            uri: z.string().nullable(),

            // -- chain --
            network: svmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Holders',
        description: 'Returns top token holders ranked by balance.',

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
                                            last_update: '2025-09-17 20:06:47',
                                            last_update_block_num: 367491952,
                                            last_update_timestamp: 1758139607,
                                            owner: '7AN6avKCJPMkXkW8kPwMuHmaWvJeHH69e8rKpLf9rdfk',
                                            mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
                                            program_id: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
                                            amount: '365461857133582111',
                                            value: 365461857133.5821,
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

route.get('/', openapi, zValidator('query', querySchema, validatorHook), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.tokenDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.holders_for_contract?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for holders could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, {
        database: dbConfig.database,
        clickhouse_settings: { query_cache_ttl: config.cacheDurations[1] },
    });
    return handleUsageQueryError(c, response);
});

export default route;
