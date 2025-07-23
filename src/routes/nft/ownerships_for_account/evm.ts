import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, EVM_networkIdSchema, evmAddress, paginationQuery, Vitalik, tokenStandardSchema, evmAddressSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    address: Vitalik,
});

const querySchema = z.object({
    network_id: EVM_networkIdSchema,
    token_standard: tokenStandardSchema,
    contract: evmAddressSchema.default('')
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // NFT token metadata
        token_id: z.string(),
        token_standard: tokenStandardSchema,
        contract: evmAddress,
        owner: evmAddress,

        // OPTIONAL: Contract Metadata
        symbol: z.optional(z.string()),

        // OPTIONAL: Token metadata
        uri: z.optional(z.string()),
        name: z.optional(z.string()),
        image: z.optional(z.string()),
        description: z.optional(z.string()),
        network_id: EVM_networkIdSchema,
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(withErrorResponses({
    summary: 'NFT Ownerships',
    description: 'Provides NFT Ownerships for Account.',
    tags: ['EVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "token_id": "12",
                                "token_standard": "ERC721",
                                "contract": "0x000386e3f7559d9b6a2f5c46b4ad1a9587d59dc3",
                                "owner": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
                                "symbol": "BANC",
                                "name": "Bored Ape Nike Club",
                                "network_id": "mainnet"
                            },
                        ]
                    }
                },
            },
        }
    },
}));

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema>; }; }>();

route.get('/:address', openapi, validator('param', paramSchema, validatorHook), validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const { database, type } = config.nftDatabases[params.network_id]!;
    const query = sqlQueries['nft_ownerships_for_account']?.[type];
    if (!query) return c.json({ error: 'Query for NFT ownerships could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database });
    return handleUsageQueryError(c, response);
});

export default route;