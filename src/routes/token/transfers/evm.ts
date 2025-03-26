import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { ageSchema, evmAddressSchema, statisticsSchema, paginationQuery } from '../../../types/zod.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_AGE, DEFAULT_NETWORK_ID } from '../../../config.js';
import { networkIdSchema } from '../../networks.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    address: evmAddressSchema.openapi({ description: 'EVM address to query' }),
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    age: z.optional(ageSchema),
    contract: z.optional(evmAddressSchema.openapi({ description: 'Filter by contract address' })),
}).merge(paginationQuery);

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
        transaction_id: z.string(),

        // -- contract --
        symbol: z.string(),
        decimals: z.number(),

        // -- chain --
        network_id: networkIdSchema,
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    description: 'Token Transfers by Wallet Address',
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
                                "block_num": 22071757,
                                "timestamp": 1742276627,
                                "date": "2025-03-18",
                                "contract": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                                "from": "0x835678a611b28684005a5e2233695fb6cbbb0007",
                                "to": "0x5a52e96bacdabb82fd05763e25335261b270efcb",
                                "amount": "5806756000000",
                                "transaction_id": "0x843979ef37cbb2348c2c98f065a8684e7cd92496e08fd736a02a72d2041ecb4e",
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

    const response = await makeUsageQueryJson(c, [query], { address, age, network_id, contract }, { database });
    injectSymbol(response);
    await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});

export default route;