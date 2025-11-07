import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { sqlQueries } from '../../../../../sql/index.js';
import {
    EVM_ADDRESS_NFT_OFFERER_EXAMPLE,
    EVM_ADDRESS_NFT_RECIPIENT_EXAMPLE,
    EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE,
    EVM_TOKEN_ID_PUDGY_PENGUIN_EXAMPLE,
    EVM_TRANSACTION_NFT_SALE_EXAMPLE,
} from '../../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    evmTransactionSchema,
    nftTokenIdSchema,
    nftTokenStandardSchema,
    nftTransferTypeSchema,
    timestampSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

    type: {
        schema: nftTransferTypeSchema,
        default: '',
    },
    transaction_id: {
        schema: evmTransactionSchema,
        batched: true,
        default: '',
        meta: { example: EVM_TRANSACTION_NFT_SALE_EXAMPLE },
    },
    contract: {
        schema: evmContractSchema,
        batched: true,
        default: '',
        meta: { example: EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE },
    },
    token_id: {
        schema: nftTokenIdSchema,
        batched: true,
        default: '',
        meta: { example: EVM_TOKEN_ID_PUDGY_PENGUIN_EXAMPLE },
    },
    address: {
        schema: evmAddressSchema,
        batched: true,
        default: '',
        meta: { example: EVM_ADDRESS_NFT_OFFERER_EXAMPLE },
    },
    from_address: {
        schema: evmAddressSchema,
        batched: true,
        default: '',
        meta: { example: EVM_ADDRESS_NFT_OFFERER_EXAMPLE },
    },
    to_address: {
        schema: evmAddressSchema,
        batched: true,
        default: '',
        meta: { example: EVM_ADDRESS_NFT_RECIPIENT_EXAMPLE },
    },

    start_time: { schema: timestampSchema, prefault: '2025-01-01' },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
    start_block: { schema: blockNumberSchema, default: 0 },
    end_block: { schema: blockNumberSchema, default: 9999999999 },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            block_num: z.number(),
            datetime: z.string().describe('ISO 8601 datetime string'),
            timestamp: z.number(),

            // NFT token metadata
            '@type': nftTransferTypeSchema,
            transfer_type: z.string(),
            transaction_id: evmTransactionSchema,
            contract: evmContractSchema,
            token_id: nftTokenIdSchema,
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            token_standard: nftTokenStandardSchema,
            from: evmAddressSchema,
            to: evmAddressSchema,
            amount: z.number(),
            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Transfers',
        description: 'Returns NFT transfer events including mints, burns, and ownership changes.',

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
                                            block_num: 22098625,
                                            datetime: '2025-03-21 23:46:11',
                                            timestamp: 1742600771,
                                            '@type': 'TRANSFER',
                                            transfer_type: 'Single',
                                            transaction_id:
                                                '0x8cc8b83e7b7fec752bd689700156990e7ce4d6b890f7b5ab58adf2fb602a98b9',
                                            contract: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
                                            token_id: '5712',
                                            name: 'PudgyPenguins',
                                            symbol: 'PPG',
                                            token_standard: 'ERC721',
                                            from: '0x355062b5d0e324815290b96370e87607a71d613d',
                                            to: '0x7ccde43632b3287fda060719d802b2c4cb6f769b',
                                            amount: 1,
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

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema> } }>();

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.req.valid('query');

    const dbConfig = config.nftDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.nft_transfers?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for NFT transfers could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
