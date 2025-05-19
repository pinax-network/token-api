import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { handleUsageQueryError, makeUsageQueryJson } from '../../../handleQuery.js';
import { statisticsSchema, networkIdSchema, evmAddress, evmAddressSchema } from '../../../types/zod.js';
import { sqlQueries } from '../../../sql/index.js';
import { z } from 'zod';
import { config } from '../../../config.js';

const route = new Hono();

const paramSchema = z.object({
    contract: evmAddress,
});

const querySchema = z.object({
    network_id: z.optional(networkIdSchema),
});

const responseSchema = z.object({
    data: z.array(z.object({
        
    })),
    statistics: z.optional(statisticsSchema),
});

const openapi = describeRoute({
    summary: 'NFT Metadata',
    description: 'Provides NFT collection metadata.',
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

route.get('/:contract', openapi, validator('param', paramSchema), validator('query', querySchema), async (c) => {
    const parseContract = evmAddressSchema.safeParse(c.req.param("contract"));
    if (!parseContract.success) return c.json({ error: `Invalid EVM contract: ${parseContract.error.message}` }, 400);

    const contract = parseContract.data;
    const network_id = networkIdSchema.safeParse(c.req.query("network_id")).data ?? config.defaultNetwork;
    const database = `${network_id}:evm-nft-tokens@v0.4.3`; // TODO: NFT database in config

    const query = sqlQueries['nft_metadata_for_collection']?.['evm'];
    if (!query) return c.json({ error: 'Query could not be loaded' }, 500);

    const response = await makeUsageQueryJson(c, [query], { contract, network_id }, { database });
    return handleUsageQueryError(c, response);
});


export default route;
