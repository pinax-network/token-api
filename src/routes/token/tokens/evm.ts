import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { evmAddressSchema, statisticsSchema } from '../../../types/zod.js';
import { EVM_SUBSTREAMS_VERSION } from '../index.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { DEFAULT_NETWORK_ID } from '../../../config.js';
import * as web3icons from "@web3icons/core"
import { networkIdSchema } from '../../networks.js';

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
        total_supply: z.string(),
        holders: z.number(),

        // -- chain --
        network_id: networkIdSchema,
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    description: 'Token Holders and Supply by Contract Address',
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
                                "total_supply": "10803355950136852966436018411",
                                "holders": 170086
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

    type Data = {symbol: string, icon: {web3icon: string}}
    const result = await makeUsageQueryJson<Data>(c, [query], { contract, network_id }, database);

    // inject Web3 Icons
    if ( 'data' in result ) {
        result.data.forEach((row: Data) => {
            const web3icon = findIcon(row.symbol);
            if (web3icon) {
                row.icon = {
                    web3icon
                }
            }
        });
        return c.json(result);
    }
    return handleUsageQueryError(c, result);
});

function findIcon(symbol?: string) {
    if (!symbol) return null;
    for (const token in web3icons.svgs.tokens.mono) {
        if ( token === symbol ) {
            return token
        }
    }
    return null
}

export default route;