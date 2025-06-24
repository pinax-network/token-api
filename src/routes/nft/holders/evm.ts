import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, EVM_networkIdSchema, evmAddressSchema, PudgyPenguins } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    contract: PudgyPenguins,
});

const querySchema = z.object({
    network_id: z.optional(EVM_networkIdSchema),
});

const responseSchema = z.object({
    data: z.array(z.object({
        token_standard: z.string(),
        address: evmAddressSchema,
        quantity: z.number().openapi({ description: 'Number of tokens held by this address' }),
        unique_tokens: z.number().openapi({ description: 'Number of unique token IDs held by this address' }),
        percentage: z.number().openapi({ description: 'Percentage of total supply held by this address' }),
        network_id: EVM_networkIdSchema,
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'NFT Holders',
    description: 'Provides NFT holders per contract.',
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
                                "address": "0x29469395eaf6f95920e59f858042f0e28d98a20b",
                                "quantity": 534,
                                "unique_tokens": 534,
                                "percentage": 0.06008100810081008,
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseContract = evmAddressSchema.safeParse(c.req.param("contract"));
    if (!parseContract.success) return c.json({ error: `Invalid EVM contract: ${parseContract.error.message}` }, 400);

    // REQUIRED URL param
    const contract = parseContract.data;

    // OPTIONAL URL query
    const network_id = EVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultEvmNetwork;
    const { database, type } = config.nftDatabases[network_id]!;

    const query = sqlQueries['nft_holders']?.[type];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { contract, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
