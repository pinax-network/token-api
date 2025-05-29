import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import { evmAddressSchema, networkIdSchema, statisticsSchema, GRT, USDC_WETH, protocolSchema, tokenSchema } from '../../../types/zod.js';
import { config } from '../../../config.js';
import { sqlQueries } from '../../../sql/index.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';

const route = new Hono();

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
    pool: z.optional(USDC_WETH),
    factory: z.optional(evmAddressSchema),
    token: z.optional(evmAddressSchema),
    symbol: z.optional(z.string()),
    protocol: z.optional(protocolSchema),
});

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),

        // -- chain --
        network_id: networkIdSchema,

        // -- transaction --
        transaction_id: z.string(),

        // -- pool --
        // creator: evmAddressSchema, // TO-DO: https://github.com/pinax-network/substreams-evm-tokens/issues/37
        factory: evmAddressSchema,
        pool: evmAddressSchema,
        token0: tokenSchema,
        token1: tokenSchema,
        fee: z.number(),
        protocol: z.string(),
    })),
    statistics: z.optional(statisticsSchema),
});


const openapi = describeRoute({
    summary: 'Liquidity Pools',
    description: 'Provides Uniswap V2 & V3 liquidity pool metadata.',
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
                                "block_num": 22589384,
                                "datetime": "2025-05-29 15:46:23",
                                "transaction_id": "0x43cee95f1449b6b4d394fab31234fd6decdcd049153cc1338fe627e5483a3d36",
                                "factory": "0x000000000004444c5dc75cb358380d2e3de08a90",
                                "pool": "0x12b900f4e5c4b1d2aab6870220345c668b068fc6e588dd59dfe6f223d60608f1",
                                "token0": {
                                    "address": "0xdac17f958d2ee523a2206206994597c13d831ec7",
                                    "symbol": "USDT",
                                    "decimals": 6
                                },
                                "token1": {
                                    "address": "0xf2c88757f8d03634671208935974b60a2a28bdb3",
                                    "symbol": "SHELL",
                                    "decimals": 18
                                },
                                "fee": 699000,
                                "protocol": "uniswap_v4",
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            }
        },
    },
});

route.get('/', openapi, validator('query', querySchema), async (c) => {
    let pool = c.req.query("pool") ?? '';
    if (pool) {
        const parsed = evmAddressSchema.safeParse(pool);
        if (!parsed.success) {
            return c.json({ error: `Invalid pool EVM address: ${parsed.error.message}` }, 400);
        }
        pool = parsed.data;
    }

    let token = c.req.query("token") ?? '';
    if (token) {
        const parsed = evmAddressSchema.safeParse(token);
        if (!parsed.success) {
            return c.json({ error: `Invalid token EVM address: ${parsed.error.message}` }, 400);
        }
        token = parsed.data;
    }

    const symbol = c.req.query("symbol") ?? '';
    const protocol = c.req.query("protocol") ?? '';
    if (protocol) {
        const parsed = protocolSchema.safeParse(protocol);
        if (!parsed.success) {
            return c.json({ error: `Invalid protocol: ${parsed.error.message}` }, 400);
        }
    }

    let factory = c.req.query("factory") ?? '';
    if (factory) {
        const parsed = evmAddressSchema.safeParse(factory);
        if (!parsed.success) {
            return c.json({ error: `Invalid factory EVM address: ${parsed.error.message}` }, 400);
        }
        factory = parsed.data;
    }

    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = config.uniswapDatabases[network_id];

    const query = sqlQueries['pools']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { protocol, pool, token, factory, symbol, network_id }, { database });
    return handleUsageQueryError(c, response);
});

export default route;