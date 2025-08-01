import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { sqlQueries } from '../../../sql/index.js';
import { EVM_networkIdSchema, PudgyPenguins, evmAddressSchema, statisticsSchema } from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    contract: PudgyPenguins,
});

const querySchema = z.object({
    network_id: EVM_networkIdSchema,
});

const responseSchema = z.object({
    data: z.array(
        z.object({
            contract: evmAddressSchema,
            contract_creation: z.string(),
            contract_creator: evmAddressSchema,
            name: z.string(),
            symbol: z.string(),
            owners: z.number(),
            total_supply: z.number(),
            total_unique_supply: z.number(),
            total_transfers: z.number(),
            network_id: EVM_networkIdSchema,
        })
    ),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Collection',
        description: 'Provides single NFT collection metadata, total supply, owners & total transfers.',
        tags: ['EVM'],
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
                                            token_standard: 'ERC721',
                                            contract: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
                                            contract_creation: '2021-07-22 12:26:01',
                                            contract_creator: '0xe9da256a28630efdc637bfd4c65f0887be1aeda8',
                                            name: 'PudgyPenguins',
                                            symbol: 'PPG',
                                            owners: 12258,
                                            total_supply: 8888,
                                            total_unique_supply: 8888,
                                            total_transfers: 185128,
                                            network_id: 'mainnet',
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

route.get(
    '/:contract',
    openapi,
    validator('param', paramSchema, validatorHook),
    validator('query', querySchema, validatorHook),
    async (c) => {
        const params = c.get('validatedData');

        const dbConfig = config.nftDatabases[params.network_id];
        if (!dbConfig) {
            return c.json({ error: `Network not found: ${params.network_id}` }, 400);
        }
        let query = sqlQueries.nft_metadata_for_collection?.[dbConfig.type];
        if (!query) return c.json({ error: 'Query for NFT collections could not be loaded' }, 500);

        const contractsDb = config.contractDatabases[params.network_id]?.database || '';
        query = query.replace('{contracts_db}', contractsDb);

        const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
        return handleUsageQueryError(c, response);
    }
);

export default route;
