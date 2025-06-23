import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, EVM_networkIdSchema, evmAddress, evmAddressSchema, paginationQuery, Vitalik, tokenStandardSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    address: Vitalik,
});

const querySchema = z.object({
    network_id: z.optional(EVM_networkIdSchema),
    token_standard: z.optional(tokenStandardSchema)
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

const openapi = describeRoute({
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
});

route.get('/:address', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseAddress = evmAddressSchema.safeParse(c.req.param("address"));
    if (!parseAddress.success) return c.json({ error: `Invalid EVM address: ${parseAddress.error.message}` }, 400);

    const parseTokenStandard = tokenStandardSchema.safeParse(c.req.query("token_standard") ?? '');
    if (!parseTokenStandard.success) return c.json({ error: `Invalid Token standard: ${parseTokenStandard.error.message}` }, 400);

    const address = parseAddress.data;
    const token_standard = parseTokenStandard.data;
    const network_id = EVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultEvmNetwork;
    const database = config.nftDatabases[network_id]!.name;

    const query = sqlQueries['nft_ownerships_for_account']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { address, token_standard, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
