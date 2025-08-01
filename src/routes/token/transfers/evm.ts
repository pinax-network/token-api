import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    EVM_networkIdSchema,
    Vitalik,
    endTimeSchema,
    evmAddressSchema,
    evmTransactionSchema,
    orderBySchemaTimestamp,
    orderDirectionSchema,
    paginationQuery,
    startTimeSchema,
    statisticsSchema,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,

        // -- `token` filter --
        from: evmAddressSchema.default(''),
        to: Vitalik.default(''),
        contract: evmAddressSchema.default(''),

        // -- `time` filter --
        startTime: startTimeSchema,
        endTime: endTimeSchema,
        orderBy: orderBySchemaTimestamp,
        orderDirection: orderDirectionSchema,

        // -- `transaction` filter --
        transaction_id: evmTransactionSchema.default(''),
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
            transaction_id: z.string(),

            // -- transfer --
            contract: evmAddressSchema,
            from: evmAddressSchema,
            to: evmAddressSchema,
            amount: z.string(),
            value: z.number(),

            // -- chain --
            network_id: EVM_networkIdSchema,

            // -- contract --
            symbol: z.optional(z.string()),
            decimals: z.optional(z.number()),

            // // -- price --
            // price_usd: z.optional(z.number()),
            // value_usd: z.optional(z.number()),
            // low_liquidity: z.optional(z.boolean()),
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Transfers Events',
        description: 'Provides ERC-20 & Native transfer events.',
        tags: ['EVM'],
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
                                            block_num: 22349873,
                                            datetime: '2025-04-26 01:18:47',
                                            timestamp: 1745630327,
                                            transaction_id:
                                                '0xd80ed9764b0bc25b982668f66ec1cf46dbe27bcd01dffcd487f43c92f72b2a84',
                                            contract: '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
                                            from: '0x7d2fbc0eefdb8721b27d216469e79ef288910a83',
                                            to: '0xa5eb953d1ce9d6a99893cbf6d83d8abcca9b8804',
                                            decimals: 18,
                                            symbol: 'GRT',
                                            value: 11068.393958659999,
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
