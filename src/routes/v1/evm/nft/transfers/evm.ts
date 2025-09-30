import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { sqlQueries } from '../../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    evmAddress,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    evmTransactionSchema,
    nftTokenIdSchema,
    timestampSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

    transaction_id: { schema: evmTransactionSchema, batched: true, default: '' },
    contract: { schema: evmContractSchema, batched: true, default: '' },
    token_id: { schema: nftTokenIdSchema, batched: true, default: '' },
    address: { schema: evmAddressSchema, batched: true, default: '' },
    from_address: { schema: evmAddressSchema, batched: true, default: '' },
    to_address: { schema: evmAddressSchema, batched: true, default: '' },

    start_time: { schema: timestampSchema, default: 1735689600 },
    end_time: { schema: timestampSchema, default: 9999999999 },
    start_block: { schema: blockNumberSchema, default: 0 },
    end_block: { schema: blockNumberSchema, default: 9999999999 },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // NFT token metadata
            '@type': z.enum(['TRANSFER', 'MINT', 'BURN']),
            block_num: z.number(),
            block_hash: z.string(),
            timestamp: z.string(),
            transaction_id: z.string(),
            contract: evmAddress,
            symbol: z.optional(z.string()),
            name: z.optional(z.string()),
            from: evmAddress,
            to: evmAddress,
            token_id: z.string(),
            amount: z.number(),
            transfer_type: z.optional(z.string()),
            token_standard: z.optional(z.string()),
            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Transfers',
        description: 'Returns NFT transfer events including mints, burns, and ownership changes.',

        tags: ['EVM NFTs'],
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
                                            '@type': 'TRANSFER',
                                            block_num: 22588725,
                                            block_hash:
                                                '0xe8d2f48bb5d7619fd0c180d6d54e7ca94c5f4eddfcfa7a82d4da55b310dd462a',
                                            timestamp: '2025-05-29 13:32:23',
                                            transaction_id:
                                                '0xa7b3302a5fe4a60e4ece22dfb2d98604daef5dc610fa328d8d0a7a92f3efc7b9',
                                            token_standard: 'ERC721',
                                            contract: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
                                            name: 'PudgyPenguins',
                                            symbol: 'PPG',
                                            from: '0x2afec1c9af7a5494503f8acfd5c1fdd7d2c57480',
                                            to: '0x29469395eaf6f95920e59f858042f0e28d98a20b',
                                            token_id: '500',
                                            amount: 1,
                                            transfer_type: 'Single',
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

    const dbConfig = config.nftDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.nft_transfers?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for NFT transfers could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
