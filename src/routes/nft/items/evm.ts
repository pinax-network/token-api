import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, networkIdSchema, evmAddress, evmAddressSchema, tokenIdSchema, PudgyPenguins, PudgyPenguinsItem, tokenStandardSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    token_id: PudgyPenguinsItem,
    contract: PudgyPenguins
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
});

const responseSchema = z.object({
    data: z.array(z.object({
        // NFT token metadata
        token_id: z.string(),
        token_standard: tokenStandardSchema,
        contract: evmAddress,
        owner: evmAddress,

        // OPTIONAL: Token Metadata
        uri: z.optional(z.string()),
        name: z.optional(z.string()),
        image: z.optional(z.string()),
        description: z.optional(z.string()),
        attributes: z.optional(z.array(z.object({
            trait_type: z.string(),
            value: z.string(),
            display_type: z.optional(z.string()),
        }))),
        network_id: networkIdSchema,

    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'NFT Items',
    description: 'Provides single NFT token metadata, ownership & traits.',
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
                                "token_standard": "ERC721",
                                "contract": "0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
                                "token_id": "5712",
                                "owner": "0x9379557bdf32f5ee296ca7b360ccb8dcb9543d8e",
                                "uri": "ipfs://bafybeibc5sgo2plmjkq2tzmhrn54bk3crhnc23zd2msg4ea7a4pxrkgfna/5712",
                                "name": "Pudgy Penguin #5712",
                                "description": "A collection 8888 Cute Chubby Pudgy Penquins sliding around on the freezing ETH blockchain.",
                                "image": "ipfs://QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin/5712.png",
                                "attributes": [
                                    {
                                        "trait_type": "Background",
                                        "value": "Blue"
                                    },
                                    {
                                        "trait_type": "Skin",
                                        "value": "Olive Green"
                                    },
                                    {
                                        "trait_type": "Body",
                                        "value": "Turtleneck Green"
                                    },
                                    {
                                        "trait_type": "Face",
                                        "value": "Scar"
                                    },
                                    {
                                        "trait_type": "Head",
                                        "value": "Party Hat"
                                    }
                                ],
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/contract/:contract/token_id/:token_id', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseContract = evmAddressSchema.safeParse(c.req.param("contract"));
    if (!parseContract.success) return c.json({ error: `Invalid EVM contract: ${parseContract.error.message}` }, 400);

    const parseTokenId = tokenIdSchema.safeParse(c.req.param("token_id"));
    if (!parseTokenId.success) return c.json({ error: `Invalid Token ID: ${parseTokenId.error.message}` }, 400);

    // REQUIRED URL param
    const contract = parseContract.data;
    const token_id = parseTokenId.data;

    // OPTIONAL URL query
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = config.nftDatabases[network_id];

    const query = sqlQueries['nft_metadata_for_token']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { contract, token_id, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
