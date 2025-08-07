import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    filterByTokenAccount,
    paginationQuery,
    SolanaSPLTokenProgramIds,
    SVM_networkIdSchema,
    statisticsSchema,
    svmAddressSchema,
    WSOL,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const querySchema = z
    .object({
        token_account: filterByTokenAccount.default(''),
        mint: WSOL.default(''),
        program_id: SolanaSPLTokenProgramIds.default(''),
        network_id: SVM_networkIdSchema,
    })
    .extend(paginationQuery.shape);

const responseSchema = z.object({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.string(),
            timestamp: z.number(),

            // -- transaction --
            // signature: z.string(),

            // -- instruction --
            program_id: svmAddressSchema,

            // -- balance --
            token_account: svmAddressSchema,
            mint: svmAddressSchema,
            amount: z.string(),
            value: z.number(),
            decimals: z.number(),

            // -- network --
            network_id: SVM_networkIdSchema,

            // // -- contract --
            // decimals: z.optional(z.number())
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Solana Balances',
        description: 'Returns SPL token balances for Solana token accounts with mint and program data.',

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
                                            block_num: 352305913,
                                            datetime: '2025-07-10 05:14:43',
                                            timestamp: 1752124483,
                                            program_id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                                            token_account: '4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A',
                                            mint: 'So11111111111111111111111111111111111111112',
                                            amount: '30697740781078',
                                            value: 30697.740781078,
                                            decimals: 9,
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
    const query = sqlQueries.balances_for_account?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
