import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    svmAddressSchema,
    svmAuthoritySchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmSPLTokenProgramIdSchema,
    svmTokenAccountSchema,
    svmTransactionSchema,
    timestampSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },

    signature: { schema: svmTransactionSchema, batched: true, default: '' },
    // address: { schema: svmTokenAccountSchema, batched: true, default: '' },
    source: { schema: svmTokenAccountSchema, batched: true, default: '' },
    destination: { schema: svmTokenAccountSchema, batched: true, default: '' },
    authority: { schema: svmAuthoritySchema, batched: true, default: '' },
    mint: { schema: svmMintSchema, batched: true, default: '' },
    program_id: { schema: svmSPLTokenProgramIdSchema, default: '' },

    start_time: { schema: timestampSchema, default: 1735689600 },
    end_time: { schema: timestampSchema, default: 9999999999 },
    start_block: { schema: blockNumberSchema, default: 0 },
    end_block: { schema: blockNumberSchema, default: 9999999999 },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.iso.datetime(),
            timestamp: z.number(),

            // -- transaction --
            signature: z.string(),

            // -- instruction --
            program_id: svmAddressSchema,
            mint: svmAddressSchema,
            authority: svmAddressSchema,

            // -- transfer --
            source: svmAddressSchema,
            destination: svmAddressSchema,
            amount: z.string(),
            value: z.number(),
            decimals: z.nullable(z.number().int()),

            name: z.string(),
            symbol: z.string(),
            uri: z.string(),

            // -- chain --
            network: svmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Transfers',
        description: 'Returns SPL token transfers with program, authority, and account information.',

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
                                            block_num: 357525780,
                                            datetime: '2025-08-03 04:39:21',
                                            timestamp: 1754195961,
                                            signature:
                                                'BxkksmejT6seHWtRC8aieMUgxpHwoYmdv9GmjeCKuLbL1xxWBSSXqrWQybfRMmKR6ZFc61kuGQzftBCwEKByiVK',
                                            program_id: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
                                            mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
                                            authority: '5YPxToTobawvkbn5rkWKYDhZqHf5v6LAtRLNPGiq6U2A',
                                            source: 'BEyX6Nwqj1wQqSJWEHK5ezKtNxatyrgGu1tbCLnLpNQt',
                                            destination: '64nnJ2CBUZ3VasttjVhxbQXqzbjAxnj4VT4vBrrveNV',
                                            amount: 1520033500,
                                            value: 1520.0335,
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

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const dbConfig = config.tokenDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.transfers?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for transfers could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
