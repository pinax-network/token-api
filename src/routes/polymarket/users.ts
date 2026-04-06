import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { config } from '../../config.js';
import { handleUsageQueryError, makeUsageQueryJson } from '../../handleQuery.js';
import { apiUsageResponseSchema, createQuerySchema, evmAddress, polymarketUserSortBySchema } from '../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../utils.js';

import baseQuery from './users.sql' with { type: 'text' };

const querySchema = createQuerySchema({
    user: { schema: evmAddress, optional: true },
    sort_by: { schema: polymarketUserSortBySchema, prefault: 'total_volume' },
});

const responseSchema = apiUsageResponseSchema.extend({
    data: z.array(
        z.object({
            user: z.string(),
            buys: z.number(),
            sells: z.number(),
            transactions: z.number(),
            volume_bought: z.number(),
            volume_sold: z.number(),
            total_volume: z.number(),
            realized_pnl: z.number(),
            first_trade: z.string(),
            last_trade: z.string(),
        })
    ),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'User Lookup',
        description:
            'Returns trading statistics per user: volume, PNL, trade counts, and activity window. When no user address is provided, returns a paginated leaderboard for discovery.\n\nUse this to find active traders or look up aggregate stats for a specific wallet.',
        tags: ['Polymarket Users'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': {
                        schema: resolver(responseSchema),
                        examples: {
                            leaderboard: {
                                value: {
                                    data: [
                                        {
                                            user: '0x4ce73141dbfce41e65db3723e31059a730f0abad',
                                            buys: 62724,
                                            sells: 560154,
                                            transactions: 622878,
                                            volume_bought: 21058584.22,
                                            volume_sold: 66145363.7,
                                            total_volume: 87203947.92,
                                            realized_pnl: 45086779.48,
                                            first_trade: '2024-05-30 17:39:29',
                                            last_trade: '2024-12-04 14:00:40',
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
        },
    })
);

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema> } }>();

route.get('/', openapi, zValidator('query', querySchema, validatorHook), validator('query', querySchema), async (c) => {
    const params = c.req.valid('query');

    const db = config.polymarketDatabases.polymarket;
    if (!db) {
        return c.json({ error: 'Polymarket not configured' }, 500);
    }

    const fragments = [baseQuery];
    fragments.push(`ORDER BY ${params.sort_by} DESC LIMIT {limit:UInt64} OFFSET {offset:UInt64}`);

    const response = await makeUsageQueryJson(c, fragments, {
        ...params,
        network: 'polymarket',
        db_polymarket: db.database,
    });
    return handleUsageQueryError(c, response);
});

export default route;
