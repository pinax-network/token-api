import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, networkIdSchema, evmAddress, evmAddressSchema, paginationQuery, timestampSchema, orderDirectionSchema, orderBySchemaTimestamp, Vitalik } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { now } from '../../../utils.js';

const route = new Hono();

const paramSchema = z.object({
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),

    // -- `token` filter --
    any: z.optional(Vitalik),
    from: z.optional(evmAddressSchema),
    to: z.optional(evmAddressSchema),
    contract: z.optional(evmAddressSchema),

    // -- `time` filter --
    startTime: z.optional(timestampSchema),
    endTime: z.optional(timestampSchema),
    orderBy: z.optional(orderBySchemaTimestamp),
    orderDirection: z.optional(orderDirectionSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({

    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'NFT Activities',
    description: 'Provides NFT Activities (ex: transfers, mints, sales).',
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

                            }
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

    // OPTIONAL URL query
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:${config.dbEvmNftSuffix}`;

    const query = sqlQueries['nft_activities']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { anyAddress, fromAddress, toAddress, startTime, endTime, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
