import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import {
    EVM_networkIdSchema,
    PudgyPenguins,
    endTimeSchema,
    evmAddress,
    evmAddressSchema,
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
        contract: PudgyPenguins,

        // -- `token` filter --
        anyAddress: evmAddressSchema.default(''),
        fromAddress: evmAddressSchema.default(''),
        toAddress: evmAddressSchema.default(''),

        // -- `time` filter --
        startTime: startTimeSchema,
        endTime: endTimeSchema,
        orderBy: orderBySchemaTimestamp,
        orderDirection: orderDirectionSchema,
    })
    .merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(
        z.object({
            // NFT token metadata
            '@type': z.enum(['TRANSFER', 'MINT', 'BURN']),
            block_num: z.number(),
            block_hash: z.string(),
            timestamp: z.string(),
            tx_hash: z.string(),
            contract: evmAddress,
            symbol: z.optional(z.string()),
            name: z.optional(z.string()),
            from: evmAddress,
            to: evmAddress,
            token_id: z.string(),
            amount: z.number(),
            transfer_type: z.optional(z.string()),
            token_standard: z.optional(z.string()),
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Activities',
        description: 'Provides NFT Activities (ex: transfers, mints & burns).',
        tags: ['EVM'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': {
                        schema: resolver(responseSchema),
                        example: {
                            data: [
                                {
                                    '@type': 'TRANSFER',
                                    block_num: 22588725,
                                    block_hash: '0xe8d2f48bb5d7619fd0c180d6d54e7ca94c5f4eddfcfa7a82d4da55b310dd462a',
                                    timestamp: '2025-05-29 13:32:23',
                                    tx_hash: '0xa7b3302a5fe4a60e4ece22dfb2d98604daef5dc610fa328d8d0a7a92f3efc7b9',
                                    token_standard: 'ERC721',
                                    contract: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
                                    name: 'PudgyPenguins',
                                    symbol: 'PPG',
                                    from: '0x2afec1c9af7a5494503f8acfd5c1fdd7d2c57480',
                                    to: '0x29469395eaf6f95920e59f858042f0e28d98a20b',
                                    token_id: '500',
                                    amount: 1,
                                    transfer_type: 'Single',
                                },
                            ],
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

    const { database, type } = config.nftDatabases[params.network_id]!;
    const query = sqlQueries.nft_activities?.[type];
    if (!query) return c.json({ error: 'Query for NFT activities could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database });
    return handleUsageQueryError(c, response);
});

export default route;
