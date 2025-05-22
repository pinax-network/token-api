import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, networkIdSchema, evmAddress, evmAddressSchema, tokenIdSchema, PudgyPenguins, PudgyPenguinsItem } from '../../../types/zod.js';
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
        token_standard: z.enum(['ERC721', 'ERC1155']),
        contract: evmAddress,
        owner: evmAddress,

        // OPTIONAL: Contract Metadata
        symbol: z.optional(z.string()),

        // OPTIONAL: Token Metadata
        uri: z.optional(z.string()),
        name: z.optional(z.string()),
        image: z.optional(z.string()),
        description: z.optional(z.string()),
        attributes: z.optional(z.array(z.object({
            trait_type: z.string(),
            value: z.string(),
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
                                "token_id": 888,
                                "token_standard": "ERC721",
                                "contract": "0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
                                "owner": "0x26b95d665d28ec4c53ebee834fc2a274d32f5a76",
                                "uri": "https://ipfs.io/ipfs/QmWXJXRdExse2YHRY21Wvh4pjRxNRQcWVhcKw4DLVnqGqs/888",
                                "name": "Pudgy Penguin #888",
                                "symbol": "PPG",
                                "description": "A collection 8888 Cute Chubby Pudgy Penquins sliding around on the freezing ETH blockchain.",
                                "image": "https://ipfs.io/ipfs/QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin/888.png",
                                "attributes": [
                                    {
                                        "trait_type": "Background",
                                        "value": "Purple"
                                    },
                                    {
                                        "trait_type": "Skin",
                                        "value": "Mint"
                                    },
                                    {
                                        "trait_type": "Body",
                                        "value": "Christmas Sweater Red"
                                    },
                                    {
                                        "trait_type": "Face",
                                        "value": "Aviator"
                                    },
                                    {
                                        "trait_type": "Head",
                                        "value": "Hat Red"
                                    }
                                ],
                                "network_id": "mainnet",
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
    const database = `${network_id}:${config.dbEvmNftSuffix}`;

    const query = sqlQueries['nft_metadata_for_token']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { contract, token_id, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
