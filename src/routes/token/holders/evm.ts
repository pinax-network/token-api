import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { makeUsageQuery } from '../../../handleQuery.js';
import { networkIdSchema, evmAddressSchema, limitSchema, metaSchema, offsetSchema } from '../../../types/zod.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_NETWORK_ID } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    contract: evmAddressSchema,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    limit: z.optional(limitSchema),
    offset: z.optional(offsetSchema),
    order_by: z.optional(z.string()),
});

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        timestamp: z.number(),
        date: z.string(),

        // -- contract --
        address: evmAddressSchema,
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
    description: 'Token Holders by Contract Address',
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
                                "block_num": 20581510,
                                "timestamp": 1724297855,
                                "date": "2024-08-22",
                                "contract": "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
                                "amount": "120000000000000000000000",
                                "decimals": 18,
                                "symbol": "GRT",
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseContract = evmAddressSchema.safeParse(c.req.param("contract"));
    if (!parseContract.success) return c.json({ error: `Invalid EVM contract: ${parseContract.error.message}` }, 400);

    const contract = parseContract.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? DEFAULT_NETWORK_ID;
    const database = `${network_id}:${EVM_SUBSTREAMS_VERSION}`;

    const query = sqlQueries['holders_for_contract']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    return c.json(makeUsageQuery(c, [query], { contract, network_id }, database));
});

export default route;