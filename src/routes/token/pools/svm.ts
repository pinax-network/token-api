import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    filterByAmm,
    filterByAmmPool,
    filterByMint,
    PumpFunAmmProgramId,
    paginationQuery,
    SVM_networkIdSchema,
    statisticsSchema,
    svmAddressSchema,
    tokenSchema,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const querySchema = z
    .object({
        network_id: SVM_networkIdSchema,

        // -- `swaps` filter --
        program_id: PumpFunAmmProgramId,
        amm: filterByAmm.default(''),
        amm_pool: filterByAmmPool.default(''),
        input_mint: filterByMint.default(''),
        output_mint: filterByMint.default(''),
    })
    .extend(paginationQuery.shape);

const responseSchema = z.object({
    data: z.array(
        z.object({
            program_id: svmAddressSchema,
            program_name: z.string(),

            // -- swap --
            amm: svmAddressSchema,
            amm_name: z.string(),
            amm_pool: z.optional(svmAddressSchema),

            input_mint: z.object({
                address: tokenSchema,
                symbol: z.string(),
            }),
            output_mint: z.object({
                address: tokenSchema,
                symbol: z.string(),
            }),
            transactions: z.number().positive(),

            // -- chain --
            network_id: SVM_networkIdSchema,
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Solana Pools',
        description: 'Returns AMM pool information from Solana DEX protocols with transaction counts.',

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
                                            program_id: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
                                            program_name: 'Pump.fun AMM',
                                            amm: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
                                            amm_name: 'Pump.fun AMM',
                                            amm_pool: '7FYhmwuWk8TBLaSBKTsNMrrWNUTWZp5vUSqwjigDii9f',
                                            input_mint: {
                                                address: 'So11111111111111111111111111111111111111112',
                                                symbol: 'Wrapped SOL',
                                            },
                                            output_mint: {
                                                address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                                                symbol: 'Circle: USDC Token',
                                            },
                                            transactions: 3,
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

    const dbConfig = config.uniswapDatabases[params.network_id];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network_id}` }, 400);
    }
    const query = sqlQueries.pools?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for pools could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
