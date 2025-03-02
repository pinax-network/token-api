import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/valibot'
import * as v from 'valibot'
import client from '../clickhouse/client.js'
import { APIErrorResponse } from '../utils.js'

const route = new Hono();

const openapi = describeRoute({
    description: 'Get health status of the API',
    tags: ['monitoring'],
    hide: false,
    responses: {
        200: {
            description: 'The health of the API',
            content: {
                'text/plain': { schema: resolver(v.string()) },
            },
        },
    },
})

route.get('/health', openapi, async (c) => {
    const response = await client.ping();
    if (!response.success) {
        return APIErrorResponse(c, 500, 'bad_database_response', response.error.message);
    }
    return new Response("OK");
});

export default route;