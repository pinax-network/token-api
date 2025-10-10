import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    svmAddressSchema,
    svmAmmPoolSchema,
    svmAmmSchema,
    svmMintResponseSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmProgramIdSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },

    amm: { schema: svmAmmSchema, batched: true, default: '' },
    amm_pool: { schema: svmAmmPoolSchema, batched: true, default: '' },
    input_mint: { schema: svmMintSchema, batched: true, default: '' },
    output_mint: { schema: svmMintSchema, batched: true, default: '' },
    program_id: { schema: svmProgramIdSchema, batched: true, default: '' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            program_id: svmAddressSchema,
            program_name: z.string(),

            // -- swap --
            amm: svmAddressSchema,
            amm_name: z.string(),
            amm_pool: z.optional(svmAddressSchema),

            input_mint: z.object({
                address: svmMintResponseSchema,
                symbol: z.string(),
            }),
            output_mint: z.object({
                address: svmMintResponseSchema,
                symbol: z.string(),
            }),
            transactions: z.number().positive(),

            // -- chain --
            network: svmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Liquidity Pools',
        description: 'Returns AMM pool information from Solana DEX protocols with transaction counts.',

        tags: ['SVM DEXs'],
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

    const dbConfig = config.uniswapDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.pools?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for pools could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
