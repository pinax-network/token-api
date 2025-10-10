import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { config } from '../../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../../handleQuery.js';
import { natives as nativeContracts } from '../../../../../inject/prices.tokens.js';
import { natives as nativeSymbols } from '../../../../../inject/symbol.tokens.js';
import { sqlQueries } from '../../../../../sql/index.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    evmAddress,
    evmAddressSchema,
    evmContractSchema,
    evmNetworkIdSchema,
    evmTransactionSchema,
    nftTokenIdSchema,
    timestampSchema,
} from '../../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: evmNetworkIdSchema },

    transaction_id: { schema: evmTransactionSchema, batched: true, default: '' },
    contract: { schema: evmContractSchema, batched: true, default: '' },
    token_id: { schema: nftTokenIdSchema, batched: true, default: '' },
    address: { schema: evmAddressSchema, batched: true, default: '' },
    from_address: { schema: evmAddressSchema, batched: true, default: '' },
    to_address: { schema: evmAddressSchema, batched: true, default: '' },

    start_time: { schema: timestampSchema, default: 1735689600 },
    end_time: { schema: timestampSchema, default: 9999999999 },
    start_block: { schema: blockNumberSchema, default: 0 },
    end_block: { schema: blockNumberSchema, default: 9999999999 },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // Block
            timestamp: z.string(),
            block_num: z.number(),
            transaction_id: z.string(),

            // Sale
            token: z.string(),
            token_id: z.string(),
            symbol: z.string(),
            name: z.string(),
            offerer: evmAddress,
            recipient: evmAddress,
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
                                            timestamp: '2025-05-29 07:52:47',
                                            block_num: 22587041,
                                            transaction_id:
                                                '0x6755df1514a066150357d454254e1ce6c1e043f873193125dc98d4c4417861ff',
                                            token: '0xbd3531da5cf5857e7cfaa92426877b022e612cf8',
                                            token_id: '6398',
                                            symbol: 'PPG',
                                            name: 'PudgyPenguins',
                                            offerer: '0xf671888173bf2fe28d71fba3106cf36d10f470fe',
                                            recipient: '0x43bf952762b087195b8ea70cf81cb6715b6bf5a9',
                                            sale_amount: 10.0667234,
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

route.get('/', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');

    const dbConfig = config.nftDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.nft_sales?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for NFT sales could not be loaded' }, 500);

    const sale_currency = nativeSymbols.get(params.network)?.symbol ?? 'Native';

    const response = await makeUsageQueryJson(
        c,
        [query],
        { ...params, sale_currency, nativeContracts: Array.from(nativeContracts) },
        { database: dbConfig.database }
    );
    return handleUsageQueryError(c, response);
});

export default route;
