import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { natives as nativeContracts } from '../../../../../inject/prices.tokens.js';
import { natives as nativeSymbols } from '../../../../../inject/symbol.tokens.js';
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
    dateTimeSchema,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    evmTransactionSchema,
    nftTokenIdSchema,
    timestampSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';
import { nftController } from '../../../../../application/container.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

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
            // Block
            block_num: z.number(),
            datetime: dateTimeSchema,
            timestamp: z.number(),

            // Sale
            transaction_id: evmTransactionSchema,
            contract: evmContractSchema,
            token_id: nftTokenIdSchema,
            name: z.string().nullable(),
            symbol: z.string().nullable(),
            offerer: evmAddressSchema,
            recipient: evmAddressSchema,
            sale_amount: z.number(),
            sale_currency: z.string(),

            network: evmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'NFT Sales',
        description: 'Returns NFT marketplace sales with price, buyer, seller, and transaction data.',

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
                                            transaction_id:
                                                '0x8cc8b83e7b7fec752bd689700156990e7ce4d6b890f7b5ab58adf2fb602a98b9',
                                            contract: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
                                            token_id: '5712',
                                            name: 'PudgyPenguins',
                                            symbol: 'PPG',
                                            offerer: '0x355062b5d0e324815290b96370e87607a71d613d',
                                            recipient: '0x7ccde43632b3287fda060719d802b2c4cb6f769b',
                                            sale_amount: 9.73,
                                            sale_currency: 'ETH',
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

const handler = nftController.createHandler({
    schema: querySchema,
    query: { key: 'nft_sales', errorMessage: 'Query for NFT sales could not be loaded' },
    transformParams: (params) => ({
        ...params,
        sale_currency: nativeSymbols.get(params.network)?.symbol ?? 'Native',
        nativeContracts: Array.from(nativeContracts),
    }),
    buildQueryOptions: (_params, dbConfig) => ({ database: dbConfig.database }),
});

route.get('/', openapi, validator('query', querySchema, validatorHook), handler);

export default route;
