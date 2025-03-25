import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { evmAddressSchema, statisticsSchema } from '../../../types/zod.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_NETWORK_ID } from '../../../config.js';
import { networkIdSchema } from '../../networks.js';
import { injectIcons } from '../../../inject/icon.js';
import { injectSymbol } from '../../../inject/symbol.js';

const route = new Hono();

const paramSchema = z.object({
    contract: evmAddressSchema,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
});

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        timestamp: z.number(),
        date: z.string(),

        // -- contract --
        address: evmAddressSchema,

        // -- contract --
        name: z.string(),
        symbol: z.string(),
        decimals: z.number(),

        // -- token --
        circulating_supply: z.string(),
        holders: z.number(),

        // -- chain --
        network_id: networkIdSchema,

        // -- icon --
        icon: z.object({
          web3icon: z.string()
        })
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Token Holders and Supply by Contract Address',
    description: 'The Tokens endpoint delivers contract metadata for a specific ERC-20 token contract from a supported EVM blockchain. Metadata includes name, symbol, number of holders, circulating supply, decimals, and more.',
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
                                "date": "2025-03-18",
                                "timestamp": "2025-03-18 15:46:59",
                                "block_num": 22074750,
                                "address": "0xc944e90c64b2c07662a292be6244bdf05cda44a7",
                                "name": "Graph Token",
                                "symbol": "GRT",
                                "decimals": 18,
                                "network_id": "mainnet",
                                "circulating_supply": "10803355950136852966436018411",
                                "holders": 170086,
                                "icon": {
                                    "web3icon": "GRT"
                                }
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

    const query = sqlQueries['tokens_for_contract']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { contract, network_id }, { database });
    injectSymbol(response);
    injectIcons(response);
    return handleUsageQueryError(c, response);
});


export default route;
