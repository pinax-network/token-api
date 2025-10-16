import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { sqlQueries } from '../../../../../sql/index.js';
import { EVM_CONTRACT_BAYC_EXAMPLE, EVM_TOKEN_ID_BAYC_EXAMPLE } from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    includeNullBalancesSchema,
    nftTokenIdSchema,
    nftTokenStandardSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    address: { schema: evmAddressSchema, batched: true },
    contract: { schema: evmContractSchema, batched: true, default: '', meta: { example: EVM_CONTRACT_BAYC_EXAMPLE } },
    token_id: { schema: nftTokenIdSchema, batched: true, default: '', meta: { example: EVM_TOKEN_ID_BAYC_EXAMPLE } },
    token_standard: { schema: nftTokenStandardSchema, default: '' },
    include_null_balances: { schema: includeNullBalancesSchema, default: false },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // NFT token metadata
            address: evmAddressSchema,
            contract: evmContractSchema,
            token_id: nftTokenIdSchema,
            token_standard: nftTokenStandardSchema,

            name: z.string().nullable(),
            symbol: z.string().nullable(),

            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Ownerships by Address',
        description: 'Returns NFT tokens owned by a wallet address with metadata and ownership information.',
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
                                            address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
                                            contract: '0x000386e3f7559d9b6a2f5c46b4ad1a9587d59dc3',
                                            token_id: '12',
                                            token_standard: 'ERC721',
                                            name: 'Bored Ape Nike Club',
                                            symbol: 'BANC',
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
    const query = sqlQueries.nft_ownerships_for_account?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for NFT ownerships could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
