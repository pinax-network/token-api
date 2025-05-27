import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, networkIdSchema, evmAddress, evmAddressSchema, paginationQuery, timestampSchema, orderDirectionSchema, orderBySchemaTimestamp, Vitalik, PudgyPenguins } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { now } from '../../../utils.js';

const route = new Hono();

const paramSchema = z.object({
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
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
                                "block_num": 17039906,
                                "block_hash": "0xaa770b7f61e7b50f2f77dca88e4ee7e3306118ab5e86ae7fda10e72578e45f25",
                                "timestamp": "2023-04-13 17:27:59",
                                "tx_hash": "0xd00e529a5b41da7c612ae1904a35df4756399a444ee6c9710704efab37ba1feb",
                                "contract": "0x52352040b5262d64973b004d031bc041720aa434",
                                "symbol": "HD",
                                "name": "HeeDong",
                                "from": "0x0000000000000000000000000000000000000000",
                                "to": "0x3a6a0e027b1e8271815930d959f6c024a9be9fa7",
                                "token_id": '1448',
                                "amount": 1,
                                "transfer_type": "Single",
                                "token_standard": "ERC721"
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
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = config.nftDatabases[network_id];

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
