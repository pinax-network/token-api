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
    PudgyPenguinsItem,
    evmAddress,
    statisticsSchema,
    tokenStandardSchema,
} from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    token_id: PudgyPenguinsItem,
    contract: PudgyPenguins,
});

const querySchema = z.object({
    network_id: EVM_networkIdSchema,
});

const responseSchema = z.object({
    data: z.array(
        z.object({
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
            attributes: z.optional(
                z.array(
                    z.object({
                        trait_type: z.string(),
                        value: z.string(),
                        display_type: z.optional(z.string()),
                    })
                )
            ),
            network_id: EVM_networkIdSchema,
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Items',
        description: 'Provides single NFT token metadata, ownership & traits.',
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
                                    token_standard: 'ERC721',
                                    contract: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
                                    token_id: '5712',
                                    owner: '0x9379557bdf32f5ee296ca7b360ccb8dcb9543d8e',
                                    uri: 'ipfs://bafybeibc5sgo2plmjkq2tzmhrn54bk3crhnc23zd2msg4ea7a4pxrkgfna/5712',
                                    name: 'Pudgy Penguin #5712',
                                    description:
                                        'A collection 8888 Cute Chubby Pudgy Penquins sliding around on the freezing ETH blockchain.',
                                    image: 'ipfs://QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin/5712.png',
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
                                    network_id: 'mainnet',
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

route.get(
    '/contract/:contract/token_id/:token_id',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.nftDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        const query = sqlQueries.nft_metadata_for_token?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for NFT items could not be loaded' }, 500);

        const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
        return handleUsageQueryError(c, response);
    }
);

export default route;
