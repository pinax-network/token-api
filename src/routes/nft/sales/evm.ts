import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, EVM_networkIdSchema, evmAddress, evmAddressSchema, paginationQuery, timestampSchema, orderDirectionSchema, orderBySchemaTimestamp, Vitalik, PudgyPenguins, PudgyPenguinsItem, tokenIdSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { now } from '../../../utils.js';
import { natives as nativeSymbols } from '../../../inject/symbol.tokens.js';
import { natives as nativeContracts } from '../../../inject/prices.tokens.js';

const route = new Hono();

const paramSchema = z.object({
});

const querySchema = z.object({
    network_id: z.optional(EVM_networkIdSchema),
    contract: PudgyPenguins,

    // -- `token` filter --
    token_id: z.optional(PudgyPenguinsItem),
    any: z.optional(evmAddressSchema),
    offerer: z.optional(evmAddressSchema),
    recipient: z.optional(evmAddressSchema),

    // -- `time` filter --
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema),
    orderBy: z.optional(orderBySchemaTimestamp),
    orderDirection: z.optional(orderDirectionSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // Block
        timestamp: z.string(),
        block_num: z.number(),
        tx_hash: z.string(),

        // Sale
        token: z.string(),
        token_id: z.string(),
        symbol: z.string(),
        name: z.string(),
        offerer: evmAddress,
        recipient: evmAddress,
        sale_amount: z.number(),
        sale_currency: z.string(),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'NFT Sales',
    description: 'Provides latest NFT marketplace sales.',
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
                                "timestamp": "2025-05-29 07:52:47",
                                "block_num": 22587041,
                                "tx_hash": "0x6755df1514a066150357d454254e1ce6c1e043f873193125dc98d4c4417861ff",
                                "token": "0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
                                "token_id": "6398",
                                "symbol": "PPG",
                                "name": "PudgyPenguins",
                                "offerer": "0xf671888173bf2fe28d71fba3106cf36d10f470fe",
                                "recipient": "0x43bf952762b087195b8ea70cf81cb6715b6bf5a9",
                                "sale_amount": 10.0667234,
                                "sale_currency": "ETH"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    let offererAddress = c.req.query("offerer") ?? '';
    if (offererAddress) {
        const parsed = evmAddressSchema.safeParse(offererAddress);
        if (!parsed.success) {
            return c.json({ error: `Invalid [offerer] EVM address: ${parsed.error.message}` }, 400);
        }
        offererAddress = parsed.data;
    }

    let recipientAddress = c.req.query("recipient") ?? '';
    if (recipientAddress) {
        const parsed = evmAddressSchema.safeParse(recipientAddress);
        if (!parsed.success) {
            return c.json({ error: `Invalid [recipient] EVM address: ${parsed.error.message}` }, 400);
        }
        recipientAddress = parsed.data;
    }

    let anyAddress = c.req.query("any") ?? '';
    if (anyAddress) {
        const parsed = evmAddressSchema.safeParse(anyAddress);
        if (!parsed.success) {
            return c.json({ error: `Invalid [any] EVM address: ${parsed.error.message}` }, 400);
        }
        anyAddress = parsed.data;
    }

    let contract = c.req.query("contract") ?? '';
    if (contract) {
        const parsed = evmAddressSchema.safeParse(contract);
        if (!parsed.success) {
            return c.json({ error: `Invalid contract EVM address: ${parsed.error.message}` }, 400);
        }
        contract = parsed.data;
    }

    let token_id: string | number = c.req.query("token_id") ?? '';
    if (token_id) {
        const parsed = tokenIdSchema.safeParse(token_id);
        if (!parsed.success) {
            return c.json({ error: `Invalid token_id: ${parsed.error.message}` }, 400);
        }
        token_id = parsed.data;
    }

    // -- `time` filter --
    const endTime = c.req.query('endTime') ?? now();
    if (endTime) {
        const parsed = timestampSchema.safeParse(endTime);
        if (!parsed.success) {
            return c.json({ error: `Invalid endTime: ${parsed.error.message}` }, 400);
        }
    }
    const startTime = c.req.query('startTime') ?? '0';
    if (startTime) {
        const parsed = timestampSchema.safeParse(startTime);
        if (!parsed.success) {
            return c.json({ error: `Invalid startTime: ${parsed.error.message}` }, 400);
        }
    }

    // OPTIONAL URL query
    const network_id = EVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultEvmNetwork;
    const database = config.nftDatabases[network_id].name;

    let query = sqlQueries['nft_sales']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const orderDirection = c.req.query('orderDirection') ?? 'desc';
    if (orderDirection) {
        const parsed = orderDirectionSchema.safeParse(orderDirection);
        if (!parsed.success) {
            return c.json({ error: `Invalid orderDirection: ${parsed.error.message}` }, 400);
        }
        if (parsed.data === 'asc') {
            query = query.replaceAll(' DESC', ' ASC');
        }
        if (parsed.data === 'desc') {
            query = query.replaceAll(' ASC', ' DESC');
        }
    }

    const sale_currency = nativeSymbols.get(network_id)?.symbol ?? 'Native';
    const response = await makeUsageQueryJson(c, [query], { anyAddress, offererAddress, recipientAddress, contract, token_id, startTime, endTime, network_id, sale_currency, nativeContracts: Array.from(nativeContracts) }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
