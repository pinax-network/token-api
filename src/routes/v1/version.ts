import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import { monitorController } from '../../application/container.js';
import { withErrorResponses } from '../../utils.js';

const route = new Hono();

const responseSchema = z.object({
    version: z.string(),
    date: z.string(),
    commit: z.string(),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'API Version Info',
        description: 'Returns API version, build date, and commit information.',
        tags: ['Monitoring'],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': { schema: resolver(responseSchema), examples: { example: { value: GIT_APP } } },
                },
            },
        },
    })
);

route.get('/version', openapi, monitorController.versionHandler());

export default route;
