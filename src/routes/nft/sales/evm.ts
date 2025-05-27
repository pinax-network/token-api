import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, networkIdSchema, evmAddress, evmAddressSchema, paginationQuery, timestampSchema, orderDirectionSchema, orderBySchemaTimestamp, Vitalik, PudgyPenguins } from '../../../types/zod.js';
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
    network_id: z.optional(networkIdSchema),

    // -- `token` filter --
    any: z.optional(evmAddressSchema),
    offerer: z.optional(evmAddressSchema),
    recipient: z.optional(evmAddressSchema),
    token: z.optional(PudgyPenguins),

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
        token_id: z.number(),
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
                                "timestamp": "2022-07-23 08:05:09",
                                "block_num": 15197755,
                                "tx_hash": "0xb1306f86242d8fb4356b1aa28f49788d41c09ba3ba99de2785386865baa3229b",
                                "token": "0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
                                "token_id": 1474,
                                "symbol": "PPG",
                                "name": "PudgyPenguins",
                                "offerer": "0xa7b9c7cb5dfaf482ce2d3166b955e685e080cbbc",
                                "recipient": "0x7ba514930f8be109e7e65a8dc2012c5d30d1c2df",
                                "sale_amount": 0.084,
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

    let token = c.req.query("token") ?? '';
    if (token) {
        const parsed = evmAddressSchema.safeParse(token);
        if (!parsed.success) {
            return c.json({ error: `Invalid token EVM address: ${parsed.error.message}` }, 400);
        }
        token = parsed.data;
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
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = config.nftDatabases[network_id];

    const query = sqlQueries['nft_sales']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const sale_currency = nativeSymbols.get(network_id)?.symbol ?? 'Native';
    const response = await makeUsageQueryJson(c, [query], { anyAddress, offererAddress, recipientAddress, token, startTime, endTime, network_id, sale_currency, nativeContracts: Array.from(nativeContracts) }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
