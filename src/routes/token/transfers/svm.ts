import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    apiUsageResponse,
    endTimeSchema,
    filterByAuthority,
    filterByTokenAccount,
    orderBySchemaTimestamp,
    orderDirectionSchema,
    PumpFunMetadataName,
    PumpFunMetadataSymbol,
    PumpFunMetadataUri,
    paginationQuery,
    SolanaSPLTokenProgramIds,
    SVM_networkIdSchema,
    startTimeSchema,
    svmAddressSchema,
    WSOL,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const querySchema = z
    .object({
        network_id: SVM_networkIdSchema,

        // -- `token` filter --
        mint: WSOL.optional(),
        source: filterByTokenAccount.optional(),
        destination: filterByTokenAccount.optional(),
        authority: filterByAuthority.optional(),
        program_id: SolanaSPLTokenProgramIds.optional(),

        // -- `time` filter --
        startTime: startTimeSchema.optional(),
        endTime: endTimeSchema.optional(),
        orderBy: orderBySchemaTimestamp.optional(),
        orderDirection: orderDirectionSchema.optional(),

        // -- `transaction` filter --
        // signature: z.optional(svmTransactionSchema),
    })
    .extend(paginationQuery.shape);

const responseSchema = apiUsageResponse.extend({
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

            name: PumpFunMetadataName,
            symbol: PumpFunMetadataSymbol,
            uri: PumpFunMetadataUri,

            // -- chain --
            network_id: SVM_networkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Transfers',
        description: 'Returns SPL token transfers with program, authority, and account information.',

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
    const query = sqlQueries.transfers?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for transfers could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
