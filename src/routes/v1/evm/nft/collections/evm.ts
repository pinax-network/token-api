import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { CHAIN_ID_MAP, querySpamScore } from '../../../../../services/spamScoring.js';
import { sqlQueries } from '../../../../../sql/index.js';
import { EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE } from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    createQuerySchema,
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
            contract_creation: z.string().describe('ISO 8601 datetime string'),
            contract_creator: evmAddressSchema,
            contract: evmContractSchema,
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            owners: z.number(),
            total_supply: z.number(),
            total_unique_supply: z.number(),
            total_transfers: z.number(),
            network_id: evmNetworkIdSchema,
            spam_status: z.enum(['spam', 'not_spam', 'pending', 'not_supported', 'error']),
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
                                            spam_status: 'pending',
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

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.nftDatabases[params.network];
    // this DB is used to fetch contract metadata (creator, creation date)
    const db_evm_contracts = config.contractDatabases[params.network];

    if (!dbConfig || !db_evm_contracts) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }

    const query = sqlQueries.nft_metadata_for_collection?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for NFT collections could not be loaded' }, 500);

    const contractAddress = params.contract.toLowerCase();

    const [response, spamScore] = await Promise.all([
        makeUsageQueryJson(
            c,
            [query],
            { ...params, db_evm_contracts: db_evm_contracts.database },
            { database: dbConfig.database }
        ),
        querySpamScore(contractAddress, params.network),
    ]);

    // inject spam score into result
    if (!('status' in response) && Array.isArray(response.data)) {
        let spamStatus: 'spam' | 'not_spam' | 'pending' | 'not_supported' | 'error' = 'pending';

        if (spamScore.result === 'success') {
            if (spamScore.contract_spam_status === 'spam') {
                spamStatus = 'spam';
            } else {
                spamStatus = 'not_spam';
            }
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
});

export default route;
