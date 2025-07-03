import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { GRT, svmAddressSchema, statisticsSchema, SVM_networkIdSchema, WSOL } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';
import { injectIcons } from '../../../inject/icon.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    contract: WSOL,
});

const querySchema = z.object({
    network_id: z.optional(SVM_networkIdSchema),
});

const responseSchema = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),

        // -- contract --
        address: svmAddressSchema,

        // -- token --
        circulating_supply: z.string(),
        holders: z.number(),

        // -- chain --
        network_id: SVM_networkIdSchema,

        // -- icon --
        icon: z.object({
            web3icon: z.string()
        }),

        // -- contract --
        symbol: z.optional(z.string()),
        name: z.optional(z.string()),
        decimals: z.optional(z.number()),

        // -- price --
        // price_usd: z.optional(z.number()),
        // market_cap: z.optional(z.number()),
        // low_liquidity: z.optional(z.boolean()),
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'Token Metadata',
    description: 'Provides SVM token contract metadata.',
    tags: ['SVM'],
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        data: [
                            {
                                "block_num": 279194558,
                                "datetime": "2024-07-23 10:54:15",
                                "contract": "11112zAgXhc6hGfdfr5anSY91mq7Cs4HHpSVEQc4ASG\u0000",
                                "decimals": 9,
                                "symbol": "TO IMPLEMENT",
                                "name": "TO IMPLEMENT",
                                "circulating_supply": "1000048190.3747444",
                                "holders": 74,
                                "network_id": "solana"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseContract = svmAddressSchema.safeParse(c.req.param("contract"));
    if (!parseContract.success) return c.json({ error: `Invalid SVM contract: ${parseContract.error.message}` }, 400);

    const contract = parseContract.data;
    const network_id = SVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultSvmNetwork;
    const { database, type } = config.tokenDatabases[network_id]!;

    const query = sqlQueries['tokens_for_contract']?.[type];
    if (!query) return c.json({ error: 'Query for tokens could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { contract, network_id }, { database });
    injectSymbol(response, network_id, true);
    injectIcons(response);
    // await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});


export default route;
