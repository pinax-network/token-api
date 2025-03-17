import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { makeUsageQuery } from '../../../handleQuery.js';
import { ageSchema, chainIdSchema, evmAddressSchema, limitSchema, metaSchema, offsetSchema } from '../../../types/zod.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_AGE, DEFAULT_CHAIN_ID } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    address: evmAddressSchema,
});

const querySchema = z.object({
    chain_id: z.optional(chainIdSchema),
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
        chain_id: chainIdSchema,
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
                                "contract": "0x27695e09149adc738a978e9a678f99e4c39e9eb9",
                                "from": "0x2b5634c42055806a59e9107ed44d43c426e58258",
                                "to": "0xa78c4208fe4fedd86fc90fad93d6fb154c3936a4",
                                "value": "8000000000000",
                                "timestamp": 1529002377,
                                "date": "2018-06-14"
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
    const chain_id = chainIdSchema.safeParse(c.req.query("chain_id")).data ?? DEFAULT_CHAIN_ID;
    const age = ageSchema.safeParse(c.req.query("age")).data ?? DEFAULT_AGE;
    const database = `${chain_id}:${EVM_SUBSTREAMS_VERSION}`;

    const contract = c.req.query("contract") ?? '';

    const query = sqlQueries['transfers_for_account']?.['evm']; // TODO: Load different chain_type queries based on chain_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    return makeUsageQuery(c, [query], { address, age, chain_id, contract }, database);
});

export default route;