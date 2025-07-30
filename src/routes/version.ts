import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import { z } from 'zod';
import { GIT_APP } from '../config.js';
import { withErrorResponses } from '../utils.js';

const route = new Hono();

const responseSchema = z.object({
    version: z.string(),
    date: z.string(),
    commit: z.string(),
});

const openapi = describeRoute(
    withErrorResponses({
        description: 'Get the version of the API',
        tags: ['Monitoring'],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': { schema: resolver(responseSchema), example: GIT_APP },
                },
            },
        },
    })
);

route.get('/version', openapi, (c) => {
    return c.json(GIT_APP);
});

export default route;
