import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { ageSchema, evmAddressSchema, statisticsSchema, paginationQuery, walletAddressSchema } from '../../../types/zod.js';
import { DB_SUFFIX } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_AGE, DEFAULT_NETWORK_ID } from '../../../config.js';
import { networkIdSchema } from '../../networks.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    address: walletAddressSchema,
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

        // -- transaction --
        transaction_id: z.string(),

        // -- transfer --
        contract: evmAddressSchema,
        from: evmAddressSchema,
        to: evmAddressSchema,
        amount: z.string(),

        // -- chain --
        network_id: networkIdSchema,

        // -- contract --
        symbol: z.optional(z.string()),
        decimals: z.optional(z.number()),

        // -- price --
        price_usd: z.optional(z.number()),
        value_usd: z.optional(z.number()),
        low_liquidity: z.optional(z.boolean()),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Token Transfers by Wallet Address',
    description: 'The EVM Transfers endpoint provides access to historical token transfer events for a specified address. This endpoint is ideal for tracking transaction history and analyzing token movements over time.',
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
                                "block_num": 22128243,
                                "timestamp": 1742957927,
                                "date": "2025-03-26",
                                "contract": "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
                                "from": "0xf89d7b9c864f589bbf53a82105107622b35eaa40",
                                "to": "0x2e4578e6c86380ca1759431fedeeae823e33357b",
                                "amount": "4805168872000000000000",
                                "transaction_id": "0x18c62cfa9c10a1e0a7bee36099151238e668ff61c97c7b9ab616aaa93c176e2c",
                                "decimals": 18,
                                "symbol": "GRT",
                                "network_id": "mainnet",
                                "price_usd": 0.1040243665135064,
                                "value_usd": 499.85464790022
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
    const database = `${network_id}:${DB_SUFFIX}`;

    const contract = c.req.query("contract") ?? '';

    const query = sqlQueries['transfers_for_account']?.['evm']; // TODO: Load different chain_type queries based on network_id
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { address, age, network_id, contract }, { database });
    injectSymbol(response);
    await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});

export default route;
