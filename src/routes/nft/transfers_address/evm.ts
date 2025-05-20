import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, networkIdSchema, evmAddress, evmAddressSchema, paginationQuery } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    address: evmAddress,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
}).merge(paginationQuery);

const responseSchema = z.object({
    data: z.array(z.object({
        
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'NFT Address transfers',
    description: 'Provides NFT address transfers.',
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
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:${config.dbEvmNftSuffix}`;

    const query = sqlQueries['nft_transfers_for_address']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { address, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
