import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, EVM_networkIdSchema, evmAddress, evmAddressSchema, paginationQuery, timestampSchema, orderDirectionSchema, orderBySchemaTimestamp, Vitalik, PudgyPenguins } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { now } from '../../../utils.js';

const route = new Hono();

const paramSchema = z.object({
});

const querySchema = z.object({
    network_id: z.optional(EVM_networkIdSchema),
    contract: PudgyPenguins,

    // -- `token` filter --
    any: z.optional(Vitalik),
    from: z.optional(evmAddressSchema),
    to: z.optional(evmAddressSchema),

    // -- `time` filter --
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema),
    orderBy: z.optional(orderBySchemaTimestamp),
    orderDirection: z.optional(orderDirectionSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        // NFT token metadata
        "@type": z.enum(['TRANSFER', 'MINT', 'BURN']),
        block_num: z.number(),
        block_hash: z.string(),
        timestamp: z.string(),
        tx_hash: z.string(),
        contract: evmAddress,
        symbol: z.optional(z.string()),
        name: z.optional(z.string()),
        from: evmAddress,
        to: evmAddress,
        token_id: z.string(),
        amount: z.number(),
        transfer_type: z.optional(z.string()),
        token_standard: z.optional(z.string()),

    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'NFT Activities',
    description: 'Provides NFT Activities (ex: transfers, mints & burns).',
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
                                "@type": "TRANSFER",
                                "block_num": 22588725,
                                "block_hash": "0xe8d2f48bb5d7619fd0c180d6d54e7ca94c5f4eddfcfa7a82d4da55b310dd462a",
                                "timestamp": "2025-05-29 13:32:23",
                                "tx_hash": "0xa7b3302a5fe4a60e4ece22dfb2d98604daef5dc610fa328d8d0a7a92f3efc7b9",
                                "token_standard": "ERC721",
                                "contract": "0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
                                "name": "PudgyPenguins",
                                "symbol": "PPG",
                                "from": "0x2afec1c9af7a5494503f8acfd5c1fdd7d2c57480",
                                "to": "0x29469395eaf6f95920e59f858042f0e28d98a20b",
                                "token_id": "500",
                                "amount": 1,
                                "transfer_type": "Single"
                            },
                        ]
                    }
                },
            },
        }
    },
});

route.get('/', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    let fromAddress = c.req.query("from") ?? '';
    if (fromAddress) {
        const parsed = evmAddressSchema.safeParse(fromAddress);
        if (!parsed.success) {
            return c.json({ error: `Invalid [from] EVM address: ${parsed.error.message}` }, 400);
        }
        fromAddress = parsed.data;
    }

    let toAddress = c.req.query("to") ?? '';
    if (toAddress) {
        const parsed = evmAddressSchema.safeParse(toAddress);
        if (!parsed.success) {
            return c.json({ error: `Invalid [to] EVM address: ${parsed.error.message}` }, 400);
        }
        toAddress = parsed.data;
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

    if (anyAddress && (fromAddress || toAddress))
        return c.json({ error: 'Cannot specify `any` with `from` or `to`' }, 400);

    // OPTIONAL URL query
    const network_id = EVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultEvmNetwork;
    const database = config.nftDatabases[network_id].name;

    let query = sqlQueries['nft_activities']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const orderDirection = c.req.query('orderDirection') ?? 'desc';
    if (orderDirection) {
        const parsed = orderDirectionSchema.safeParse(orderDirection);
        if (!parsed.success) {
            return c.json({ error: `Invalid orderBy: ${parsed.error.message}` }, 400);
        }
        if (parsed.data === 'asc') {
            query = query.replaceAll(' DESC', ' ASC');
        }
        if (parsed.data === 'desc') {
            query = query.replaceAll(' ASC', ' DESC');
        }
    }

    const response = await makeUsageQueryJson(c, [query], { anyAddress, fromAddress, toAddress, contract, startTime, endTime, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
