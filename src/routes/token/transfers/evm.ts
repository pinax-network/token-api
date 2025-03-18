import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { makeUsageQuery } from '../../../handleQuery.js';
import { ageSchema, networkIdSchema, evmAddressSchema, limitSchema, metaSchema, offsetSchema } from '../../../types/zod.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_AGE, DEFAULT_NETWORK_ID } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    address: evmAddressSchema,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    limit: z.optional(limitSchema),
    offset: z.optional(offsetSchema),
    age: z.optional(ageSchema),
    contract: z.optional(z.string()),
});

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        timestamp: z.number(),
        date: z.string(),

        // -- transfer --
        contract: evmAddressSchema,
        from: evmAddressSchema,
        to: evmAddressSchema,
        amount: z.string(),

        // -- contract --
        symbol: z.string(),
        decimals: z.number(),

        // -- chain --
        network_id: networkIdSchema,
    })),
    meta: z.optional(metaSchema),
});

const openapi = describeRoute({
    description: 'Token Transfers by Wallet Address',
    tags: ['EVM'],
    security: [{ ApiKeyAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 22049790,
                                "timestamp": 1742011715,
                                "date": "2025-03-15",
                                "contract": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                                "from": "0x5a52e96bacdabb82fd05763e25335261b270efcb",
                                "to": "0x28c6c06298d514db089934071355e5743bf21d60",
                                "amount": "200000000000000",
                                "decimals": 6,
                                "symbol": "USDC",
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:address', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseAddress = evmAddressSchema.safeParse(c.req.param("address"));
    if (!parseAddress.success) return c.json({ error: `Invalid EVM address: ${parseAddress.error.message}` }, 400);

    const address = parseAddress.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? DEFAULT_NETWORK_ID;
    const age = ageSchema.safeParse(c.req.query("age")).data ?? DEFAULT_AGE;
    const database = `${network_id}:${EVM_SUBSTREAMS_VERSION}`;

    const contract = c.req.query("contract") ?? '';

    const query = sqlQueries['transfers_for_account']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    return makeUsageQuery(c, [query], { address, age, network_id, contract }, database);
});

export default route;