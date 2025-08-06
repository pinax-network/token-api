import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    SVM_networkIdSchema,
    SolanaSPLTokenProgramIds,
    WSOL,
    filterByTokenAccount,
    paginationQuery,
    statisticsSchema,
    svmAddressSchema,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const querySchema = z
    .object({
        token_account: filterByTokenAccount.default(''),
        mint: WSOL.default(''),
        program_id: SolanaSPLTokenProgramIds.default(''),
        network_id: SVM_networkIdSchema,
    })
    .merge(paginationQuery);

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
            name: z.string(),
            symbol: z.string(),
            decimals: z.number(),

            // -- network --
            network_id: SVM_networkIdSchema,
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Balances',
        description: 'Provides Solana SPL tokens balances by token account address.',
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
                                            block_num: 358007412,
                                            datetime: '2025-08-05 09:44:48',
                                            timestamp: 1754387088,
                                            program_id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
                                            token_account: '126rQjXRnSgsxnq1EJbXh6pBzhFZtXfvYXG7XdcHdtjv',
                                            mint: 'So11111111111111111111111111111111111111112',
                                            amount: '1486642',
                                            value: 0.001486642,
                                            name: 'Wrapped SOL',
                                            symbol: 'WSOL',
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
