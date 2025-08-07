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
    evmAddress,
    evmAddressSchema,
    paginationQuery,
    tokenStandardSchema,
    Vitalik,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    address: Vitalik,
});

const querySchema = z
    .object({
        network_id: EVM_networkIdSchema,
        token_standard: tokenStandardSchema.optional(),
        contract: evmAddressSchema.optional(),
    })
    .extend(paginationQuery.shape);

const responseSchema = apiUsageResponse.extend({
    data: z.array(
        z.object({
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
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Ownerships by Address',
        description: 'Returns NFT tokens owned by a wallet address with metadata and ownership information.',
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
                                            token_id: '12',
                                            token_standard: 'ERC721',
                                            contract: '0x000386e3f7559d9b6a2f5c46b4ad1a9587d59dc3',
                                            owner: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
                                            symbol: 'BANC',
                                            name: 'Bored Ape Nike Club',
                                            network_id: 'mainnet',
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

route.get(
    '/:address',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.nftDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        const query = sqlQueries.nft_ownerships_for_account?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for NFT ownerships could not be loaded' }, 500);

        const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
        return handleUsageQueryError(c, response);
    }
);

export default route;
