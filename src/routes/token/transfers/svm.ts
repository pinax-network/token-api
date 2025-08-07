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
        mint: WSOL.default(''),
        source: filterByTokenAccount.default(''),
        destination: filterByTokenAccount.default(''),
        authority: filterByAuthority.default(''),
        program_id: SolanaSPLTokenProgramIds.default(''),

        // -- `time` filter --
        startTime: startTimeSchema,
        endTime: endTimeSchema,
        orderBy: orderBySchemaTimestamp,
        orderDirection: orderDirectionSchema,

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

            // -- chain --
            network_id: SVM_networkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Solana Transfers',
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
                                            block_num: 352372432,
                                            datetime: '2025-07-10 12:32:03',
                                            timestamp: 1752150723,
                                            signature:
                                                '4t7ZD3Fd8i9md6CTF6SEoZ9aPkr1fhRpXXSK2DhrUe5Wcm9VFdJ9Sn4WvbhdQaetLkiq8Xm3r5YgU1ffSJaA6c2e',
                                            program_id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                                            authority: 'J5kWrUKVPrtjwMVQLNgUEC9RY9Ujh8pYTN3nqWUkg1zp',
                                            mint: 'So11111111111111111111111111111111111111112',
                                            source: 'G4sbSww72omqHsC6tYe4syFtzHyBieS6MjbRWmSn1mt5',
                                            destination: '7ds7shXvLdNzihJXrjuoYYTr8bD5c2zwRxmZrrSZXgmM',
                                            amount: 333993128,
                                            decimals: 9,
                                            value: 0.333993128,
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
