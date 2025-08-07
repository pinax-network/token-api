import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import { z } from 'zod';
import client from '../clickhouse/client.js';
import { APIErrorResponse, withErrorResponses } from '../utils.js';

const route = new Hono();

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Health Check',
        description: 'Returns API operational status.',
        tags: ['Monitoring'],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'text/plain': { schema: resolver(z.string()), examples: { example: { value: 'OK' } } },
                },
            },
        },
    })
);

route.get('/health', openapi, async (c) => {
    const response = await client().ping();
    if (!response.success) {
        const message = JSON.parse(response.error.message);
        if (message.code === 516) return APIErrorResponse(c, 403, 'authentication_failed', response.error.message);
        if (message.code === 'ConnectionRefused')
            return APIErrorResponse(c, 502, 'connection_refused', response.error.message);
        return APIErrorResponse(c, 500, 'bad_database_response', response.error.message);
    }
    return new Response('OK');
});

export default route;
