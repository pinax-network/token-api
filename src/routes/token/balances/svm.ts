import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { svmAddressSchema, paginationQuery, statisticsSchema, SVM_networkIdSchema, ageSchema, intervalSchema, timestampSchema, JupyterLabs } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config, DEFAULT_AGE } from '../../../config.js';
import { injectSymbol } from '../../../inject/symbol.js';
import { injectPrices } from '../../../inject/prices.js';

const route = new Hono();

const paramSchema = z.object({
    address: JupyterLabs,
});

let querySchema: any = z.object({
    network_id: z.optional(SVM_networkIdSchema),
    contract: z.optional(z.string()),
}).merge(paginationQuery);

let responseSchema: any = z.object({
    data: z.array(z.object({
        // -- block --
        block_num: z.number(),
        datetime: z.string(),

        // -- balance --
        program: svmAddressSchema,
        contract: svmAddressSchema,
        amount: z.string(),
        value: z.number(),

        // -- network --
        network_id: SVM_networkIdSchema,

        // -- contract --
        decimals: z.optional(z.number())
    })),
    statistics: z.optional(statisticsSchema),
});

let openapi = describeRoute({
    summary: 'Balances by Address',
    description: 'Provides Solana tokens balances by wallet address.',
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
                                "block_num": 348751104,
                                "datetime": "2025-06-23 20:51:09",
                                "program": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                                "contract": "So11111111111111111111111111111111111111112",
                                "amount": 369241,
                                "value": 0.000369241,
                                "decimals": 9,
                                "network_id": "solana"
                            }
                        ]
                    }
                },
            },
        }
    },
});

route.get('/:address', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseAddress = svmAddressSchema.safeParse(c.req.param("address"));
    if (!parseAddress.success) return c.json({ error: `Invalid EVM address: ${parseAddress.error.message}` }, 400);

    const address = parseAddress.data;
    const network_id = SVM_networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultSvmNetwork;
    const { database, type } = config.tokenDatabases[network_id]!;

    const contract = c.req.query("contract") ?? '';

    const query = sqlQueries['balances_for_account']?.[config.tokenDatabases[network_id]!.type];
    if (!query) return c.json({ error: 'Query for balances could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { address, network_id, contract }, { database });
    injectSymbol(response, network_id);
    // await injectPrices(response, network_id);
    return handleUsageQueryError(c, response);
});

export default route;
