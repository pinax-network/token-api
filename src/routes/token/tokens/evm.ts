import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { GRT, evmAddressSchema, statisticsSchema, networkIdSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { injectIcons } from '../../../inject/icon.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    contract: GRT,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
});

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),

        // -- contract --
        address: evmAddressSchema,

        // -- token --
        circulating_supply: z.string(),
        holders: z.number(),

        // -- chain --
        network_id: networkIdSchema,

        // -- icon --
        icon: z.object({
          web3icon: z.string()
        }),

        // -- contract --
        symbol: z.optional(z.string()),
        name: z.optional(z.string()),
        decimals: z.optional(z.number()),

        // -- price --
        price_usd: z.optional(z.number()),
        market_cap: z.optional(z.number()),
        low_liquidity: z.optional(z.boolean()),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Token Metadata',
    description: 'Provides ERC-20 token contract metadata.',
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
                                "block_num": 22128490,
                                "datetime": "2025-03-26 03:48:35",
                                "address": "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
                                "decimals": 18,
                                "symbol": "GRT",
                                "name": "Graph Token",
                                "network_id": "mainnet",
                                "circulating_supply": "10800262823318213436822328009",
                                "holders": 170271,
                                "icon": {
                                  "web3icon": "GRT"
                                },
                                "price_usd": 0.1040243665135064,
                                "market_cap": 1123490498.375051
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
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:evm-tokens@v1.11.0:db_out`; // Hotfix

    const query = sqlQueries['tokens_for_contract']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { contract, network_id }, { database });
    injectSymbol(response, network_id, true);
    injectIcons(response);
    // await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});


export default route;
