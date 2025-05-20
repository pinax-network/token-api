import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, networkIdSchema, evmAddress, evmAddressSchema, paginationQuery, Vitalik } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    address: Vitalik,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // NFT token metadata
        token_id: z.number(),
        token_standard: z.enum(['ERC721', 'ERC1155']),
        contract: evmAddress,
        owner: evmAddress,

        // OPTIONAL: Contract Metadata
        symbol: z.optional(z.string()),

        // OPTIONAL: Token metadata
        uri: z.optional(z.string()),
        name: z.optional(z.string()),
        image: z.optional(z.string()),
        description: z.optional(z.string()),
        network_id: networkIdSchema,
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'NFT Ownerships',
    description: 'Provides NFT Ownerships.',
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
                                "token_id": 814,
                                "token_standard": "ERC721",
                                "contract": "0x60e4d786628fea6478f785a6d7e704777c86a7c6",
                                "owner": "0xe2a83b15fc300d8457eb9e176f98d92a8ff40a49",
                                "symbol": "MAYC",
                                "name": "MutantApeYachtClub",
                                "image": "ipfs://QmYRCDk7ZvCANi7YVLGLAiVdGT5CuXy6hqnN2N3YGsNi7a",
                                "network_id": "mainnet"
                            },
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:address', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseAddress = evmAddressSchema.safeParse(c.req.param("address"));
    if (!parseAddress.success) return c.json({ error: `Invalid EVM address: ${parseAddress.error.message}` }, 400);

    const address = parseAddress.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:${config.dbEvmNftSuffix}`;

    const query = sqlQueries['nft_ownerships_for_account']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { address, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
