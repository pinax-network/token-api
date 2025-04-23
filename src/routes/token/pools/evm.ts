import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod'
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
    description: 'The Pools endpoint delivers contract details for Uniswap V2 & V3 swap pools.',
    tags: ['EVM'],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 12376729,
                                "datetime": "2021-05-05 21:42:11",
                                "transaction_id": "0x125e0b641d4a4b08806bf52c0c6757648c9963bcda8681e4f996f09e00d4c2cc",
                                "factory": "0x1f98431c8ad98523631ae4a59f267346ea31f984",
                                "pool": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
                                "token0": {
                                  "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                                  "symbol": "USDC",
                                  "decimals": 6
                                },
                                "token1": {
                                  "address": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                                  "symbol": "WETH",
                                  "decimals": 18
                                },
                                "fee": 500,
                                "protocol": "uniswap_v3",
                                "network_id": "mainnet"
                            }
                        ]
                    }
                },
            }
        },
    },
})

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
    const database = `${network_id}:${config.dbEvmSuffix}`;

    const query = sqlQueries['pools']?.['evm'];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { protocol, pool, token, factory, symbol, network_id }, { database });
    return handleUsageQueryError(c, response);
});

export default route;