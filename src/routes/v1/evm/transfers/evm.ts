import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { injectSymbol } from '../../../../inject/symbol.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    apiUsageResponse,
    EVM_networkIdSchema,
    endBlockSchema,
    endTimeSchema,
    evmAddressSchema,
    evmTransactionSchema,
    paginationQuery,
    startBlockSchema,
    startTimeSchema,
    Vitalik,
} from '../../../../types/zod.js';
import { createBatchedSchema, validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = z
    .object({
        network: EVM_networkIdSchema,

        transaction_id: createBatchedSchema(evmTransactionSchema).optional(),
        address: createBatchedSchema(Vitalik).optional(),
        from_address: createBatchedSchema(evmAddressSchema).optional(),
        to_address: createBatchedSchema(evmAddressSchema).optional(),
        contract: createBatchedSchema(evmAddressSchema).optional(),

        start_time: startTimeSchema.optional(),
        end_time: endTimeSchema.optional(),
        start_block: startBlockSchema.optional(),
        end_block: endBlockSchema.optional(),
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
            transaction_id: z.string(),

            // -- transfer --
            contract: evmAddressSchema,
            from: evmAddressSchema,
            to: evmAddressSchema,

            // -- contract --
            name: z.string(),
            symbol: z.string(),
            decimals: z.number(),

            amount: z.string(),
            value: z.number(),

            // -- chain --
            network: EVM_networkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Transfers',
        description: 'Returns ERC-20 and native token transfers with transaction and block data.',
        tags: ['EVM Tokens'],
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
                                            block_num: 23383393,
                                            datetime: '2025-09-17 14:27:23',
                                            timestamp: 1758119243,
                                            transaction_id:
                                                '0xebf58ec6ab1b7fa10fa2d64b21d7d27528c46a36d4c349fc6ddecf9836bc3bba',
                                            contract: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                                            from: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
                                            to: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                                            name: 'Native',
                                            symbol: 'ETH',
                                            decimals: 18,
                                            amount: '2420480000000000',
                                            value: 0.00242048,
                                            network: 'mainnet',
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
    injectSymbol(response, params.network, false);

    return handleUsageQueryError(c, response);
});

export default route;
