import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../../handleQuery.js';
import { sqlQueries } from '../../../../sql/index.js';
import {
    SVM_ADDRESS_DESTINATION_EXAMPLE,
    SVM_AUTHORITY_USER_EXAMPLE,
    SVM_TRANSACTION_TRANSFER_EXAMPLE,
} from '../../../../types/examples.js';
import {
    apiUsageResponseSchema,
    blockNumberSchema,
    createQuerySchema,
    svmAddressSchema,
    svmAuthoritySchema,
    svmMintSchema,
    svmNetworkIdSchema,
    svmSPLTokenProgramIdSchema,
    svmTokenAccountSchema,
    svmTransactionSchema,
    timestampSchema,
} from '../../../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../../../utils.js';

const querySchema = createQuerySchema({
    network: { schema: svmNetworkIdSchema },

    signature: {
        schema: svmTransactionSchema,
        batched: true,
        default: '',
        meta: { example: SVM_TRANSACTION_TRANSFER_EXAMPLE },
    },
    // address: { schema: svmTokenAccountSchema, batched: true, default: '' },
    source: { schema: svmTokenAccountSchema, batched: true, default: '' },
    destination: {
        schema: svmTokenAccountSchema,
        batched: true,
        default: '',
        meta: { example: SVM_ADDRESS_DESTINATION_EXAMPLE },
    },
    authority: {
        schema: svmAuthoritySchema,
        batched: true,
        default: '',
        meta: { example: SVM_AUTHORITY_USER_EXAMPLE },
    },
    mint: { schema: svmMintSchema, batched: true, default: '' },
    program_id: { schema: svmSPLTokenProgramIdSchema, default: '' },

    start_time: { schema: timestampSchema, prefault: '2020-01-01' },
    end_time: { schema: timestampSchema, prefault: '2050-01-01' },
    start_block: { schema: blockNumberSchema, default: 0 },
    end_block: { schema: blockNumberSchema, default: 9999999999 },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            // -- block --
            block_num: z.number(),
            datetime: z.string().describe('ISO 8601 datetime string'),
            timestamp: z.number(),

            // -- transaction --
            signature: z.string(),
            transaction_index: z.number(),
            instruction_index: z.number(),

            // -- instruction --
            program_id: svmSPLTokenProgramIdSchema,
            mint: svmMintSchema,
            authority: svmAuthoritySchema,

            // -- transfer --
            source: svmAddressSchema,
            destination: svmAddressSchema,
            amount: z.string(),
            value: z.number(),
            decimals: z.number().nullable(),

            name: z.string().nullable(),
            symbol: z.string().nullable(),
            uri: z.string().nullable(),

            // -- chain --
            network: svmNetworkIdSchema,
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Token Transfers',
        description: 'Returns SPL token transfers with program, authority, and account information.',

        tags: ['SVM Tokens'],
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
                                            block_num: 372132067,
                                            datetime: '2025-10-09 02:10:01',
                                            timestamp: 1759975801,
                                            signature:
                                                '2Y3YJMa7Gx96ZprnWxSQHiahGdbiNFwF1DdT4ZWGf8cwJnv4fRTcFg9Z5THuAHhja66fi6Jd8fLngtH1d8qSNj3H',
                                            transaction_index: 65,
                                            instruction_index: 0,
                                            program_id: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
                                            mint: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
                                            authority: 'GXYBNgyYKbSLr938VJCpmGLCUaAHWsncTi7jDoQSdFR9',
                                            source: '5UZfa66rzeDpD9wKs3Sn3iewmavxYvpAtiF2Lqd2n1wW',
                                            destination: '64nnJ2CBUZ3VasttjVhxbQXqzbjAxnj4VT4vBrrveNV',
                                            amount: '835996345',
                                            value: 835.996345,
                                            decimals: 6,
                                            name: 'Pump',
                                            symbol: 'PUMP',
                                            uri: 'https://ipfs.io/ipfs/bafkreibcglldkfdekdkxgumlveoe6qv3pbiceypkwtli33clbzul7leo4m',
                                            network: 'solana',
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

    const dbConfig = config.tokenDatabases[params.network];
    if (!dbConfig) {
        return c.json({ error: `Network not found: ${params.network}` }, 400);
    }
    const query = sqlQueries.transfers?.[dbConfig.type];
    if (!query) return c.json({ error: 'Query for transfers could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], params, { database: dbConfig.database });
    return handleUsageQueryError(c, response);
});

export default route;
