import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { sqlQueries } from '../../../../../sql/index.js';
import {
    EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE,
    EVM_TOKEN_ID_PUDGY_PENGUIN_EXAMPLE,
} from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    nftTokenIdSchema,
    nftTokenStandardSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema, meta: { example: EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE } },
    token_id: {
        schema: nftTokenIdSchema,
        batched: true,
        default: '',
        meta: { example: EVM_TOKEN_ID_PUDGY_PENGUIN_EXAMPLE },
    },
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
            description: z.string().nullable(),
            image: z.string().nullable(),
            uri: z.string().nullable(),
            attributes: z.array(
                z.object({
                    trait_type: z.string(),
                    value: z.string(),
                    display_type: z.string().optional(),
                })
            ),
            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Items',
        description: 'Returns NFT token metadata, attributes, current owner, and media URIs.',
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
                                            address: '0x9379557bdf32f5ee296ca7b360ccb8dcb9543d8e',
                                            contract: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
                                            token_id: '5712',
                                            token_standard: 'ERC721',
                                            name: 'Pudgy Penguin #5712',
                                            description:
                                                'A collection 8888 Cute Chubby Pudgy Penquins sliding around on the freezing ETH blockchain.',
                                            image: 'ipfs://QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin/5712.png',
                                            uri: 'ipfs://bafybeibc5sgo2plmjkq2tzmhrn54bk3crhnc23zd2msg4ea7a4pxrkgfna/5712',
                                            attributes: [
                                                {
                                                    trait_type: 'Background',
                                                    value: 'Blue',
                                                },
                                                {
                                                    trait_type: 'Skin',
                                                    value: 'Olive Green',
                                                },
                                                {
                                                    trait_type: 'Body',
                                                    value: 'Turtleneck Green',
                                                },
                                                {
                                                    trait_type: 'Face',
                                                    value: 'Scar',
                                                },
                                                {
                                                    trait_type: 'Head',
                                                    value: 'Party Hat',
                                                },
                                            ],
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
    const params = c.req.valid('query');

    const dbConfig = config.nftDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.nft_metadata_for_token?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for NFT items could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
