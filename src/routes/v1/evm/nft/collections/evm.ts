import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { sqlQueries } from '../../../../../sql/index.js';
import { EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE } from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
    dateTimeSchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },
    contract: { schema: evmContractSchema, meta: { example: EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE } },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            contract_creation: dateTimeSchema,
            contract_creator: evmAddressSchema,
            contract: evmContractSchema,
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            owners: z.number(),
            total_supply: z.number(),
            total_unique_supply: z.number(),
            total_transfers: z.number(),
            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Collection',
        description: 'Returns NFT collection metadata, supply stats, owner count, and transfer history.',
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
                                            contract_creation: '2021-07-22 12:26:01',
                                            contract_creator: '0xe9da256a28630efdc637bfd4c65f0887be1aeda8',
                                            contract: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
                                            name: 'PudgyPenguins',
                                            symbol: 'PPG',
                                            token_standard: 'ERC721',
                                            owners: 4952,
                                            total_supply: 8888,
                                            total_unique_supply: 8888,
                                            total_transfers: 193641,
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

// Define the expected type for validated parameters combining both param and query schemas
type ValidatedData = z.infer<typeof querySchema>;

const route = new Hono<{ Variables: { validatedData: ValidatedData } }>();

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const dbContracts = config.contractDatabases[params.network];
    const dbNft = config.nftDatabases[params.network];
    if (!dbContracts || !dbNft) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.nft_metadata_for_collection?.[dbNft.type];
    if (!query) return c.json({ error: 'Query for NFT collections could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], {
        ...params,
        db_nft: dbNft.database,
        db_contracts: dbContracts.database,
    });

    return handleUsageQueryError(c, response);
});

export default route;
