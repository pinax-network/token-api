import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { SVM_MINT_USDC_EXAMPLE, SVM_MINT_WSOL_EXAMPLE } from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    svmAmmPoolSchema,
    svmAmmSchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmProgramIdSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';
import { dexController } from '../../../../application/container.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },

    amm: { schema: svmAmmSchema, batched: true, default: '' },
    amm_pool: { schema: svmAmmPoolSchema, batched: true, default: '', meta: { example: '' } },
    input_mint: { schema: svmMintSchema, batched: true, default: '', meta: { example: SVM_MINT_WSOL_EXAMPLE } },
    output_mint: { schema: svmMintSchema, batched: true, default: '', meta: { example: SVM_MINT_USDC_EXAMPLE } },
    program_id: { schema: svmProgramIdSchema, batched: true, default: '' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            program_id: svmProgramIdSchema,
            program_name: z.string(),

            // -- swap --
            amm: svmAmmSchema,
            amm_name: z.string(),
            amm_pool: svmAmmPoolSchema,

            input_mint: svmMintSchema,
            output_mint: svmMintSchema,
            transactions: z.number(),

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
                                            program_id: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
                                            program_name: 'Jupiter Aggregator v6',
                                            amm: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
                                            amm_name: 'Raydium Liquidity Pool V4',
                                            amm_pool: '',
                                            input_mint: 'So11111111111111111111111111111111111111112',
                                            output_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                                            transactions: 6583671,
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

const handler = dexController.createHandler({
    schema: querySchema,
    query: { key: 'pools', errorMessage: 'Query for pools could not be loaded' },
    buildQueryOptions: (_params, dbConfig) => ({ database: dbConfig.database }),
});

route.get('/', openapi, validator('query', querySchema, validatorHook), handler);

export default route;
