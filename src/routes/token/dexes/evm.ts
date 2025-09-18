import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    apiUsageResponse,
    EVM_networkIdSchema,
    evmAddressSchema,
    paginationQuery,
    protocolSchema,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        factory: evmAddressSchema.optional(),
    })
    .extend(paginationQuery.shape);

const responseSchema = apiUsageResponse.extend({
    data: z.array(
        z.object({
            factory: evmAddressSchema,
            protocol: protocolSchema,
            total_uaw: z.number(),
            total_transactions: z.number(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Supported DEXs',
        description: 'Returns supported DEXs for swaps, pools and OHLCV data.',

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
                                            factory: '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',
                                            protocol: 'uniswap_v2',
                                            total_uaw: 13479919,
                                            total_transactions: 20679385,
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
    const query = sqlQueries.supported_dexes?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for dexes could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
