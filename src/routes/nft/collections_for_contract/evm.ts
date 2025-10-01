import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { CHAIN_ID_MAP, querySpamScore } from '../../../services/spamScoring.js';
import { sqlQueries } from '../../../sql/index.js';
import { apiUsageResponse, EVM_networkIdSchema, evmAddressSchema, PudgyPenguins } from '../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../utils.js';

const paramSchema = z.object({
    contract: PudgyPenguins,
});

const querySchema = z.object({
    network_id: EVM_networkIdSchema,
});

const responseSchema = apiUsageResponse.extend({
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
            spam_status: z.enum(['spam', 'not_spam', 'pending', 'not_supported', 'error']).optional(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Collection',
        description:
            'Returns NFT collection metadata, supply stats, owner count, and transfer history.\n\nThe `spam_status` flag indicates if the NFT is likely spam. If status shows `pending`, retry in a few seconds.\n\nSpam detection is supported for:\n\n' +
            Object.keys(CHAIN_ID_MAP)
                .map((chain) => `* ${chain}`)
                .join('\n'),
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
                                            spam_status: 'not_spam',
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
type ValidatedData = z.infer<typeof querySchema> & z.infer<typeof paramSchema>;

const route = new Hono<{ Variables: { validatedData: ValidatedData } }>();

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
        const contractAddress = params.contract.toLowerCase();
        query = query.replace('{contracts_db}', contractsDb);

        const [response, spamScore] = await Promise.all([
            makeUsageQueryJson(c, [query], params, { database: dbConfig.database }),
            querySpamScore(contractAddress, params.network_id),
        ]);

        // inject spam score into result
        if (!('status' in response) && Array.isArray(response.data)) {
            let spamStatus: 'spam' | 'not_spam' | 'pending' | 'not_supported' | 'error' = 'pending';

            if (spamScore.result === 'success') {
                spamStatus = spamScore.contract_spam_status ? 'spam' : 'not_spam';
            } else if (spamScore.result === 'error') {
                spamStatus = 'error';
            } else if (spamScore.result === 'not_supported') {
                spamStatus = 'not_supported';
            }

            response.data = response.data.map((item) => ({
                ...item,
                spam_status: spamStatus,
            }));
        }

        return handleUsageQueryError(c, response);
    }
);

export default route;
