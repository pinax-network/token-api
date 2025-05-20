import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, networkIdSchema, evmAddressSchema, PudgyPenguins } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    contract: PudgyPenguins,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
});

const responseSchema = z.object({
    data: z.array(z.object({
        contract: evmAddressSchema,
        contract_creation: z.string(),
        contract_creator: evmAddressSchema,
        symbol: z.string(),
        name: z.string(),
        base_uri: z.optional(z.string()),
        total_supply: z.number(),
        owners: z.number(),
        total_transfers: z.number(),
        network_id: networkIdSchema,
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'NFT Collections',
    description: 'Provides single NFT collection metadata, total supply, owners & total transfers.',
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
                                "contract": "0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
                                "contract_creation": "2021-07-22 12:26:01",
                                "contract_creator": "0xe9da256a28630efdc637bfd4c65f0887be1aeda8",
                                "symbol": "PPG",
                                "name": "PudgyPenguins",
                                "base_uri": "ipfs://bafybeibc5sgo2plmjkq2tzmhrn54bk3crhnc23zd2msg4ea7a4pxrkgfna/",
                                "total_supply": 8888,
                                "owners": 4999,
                                "total_transfers": 185015,
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
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:${config.dbEvmNftSuffix}`;

    const query = sqlQueries['nft_metadata_for_collection']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { contract, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
