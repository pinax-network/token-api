import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver, validator } from 'hono-openapi/valibot'
import * as v from 'valibot'
import { config } from '../../config.js'
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { metaSchema } from '../../types/valibot.js'
import { makeUsageQuery } from '../../handleQuery.js'

const route = new Hono();

// notifications/cancelled
// initialize
// notifications/initialized
// ping
// notifications/progress
// resources/list
// resources/templates/list
// resources/read
// notifications/resources/list_changed
// resources/subscribe
// resources/unsubscribe
// notifications/resources/updated
// prompts/list
// prompts/get
// notifications/prompts/list_changed
// tools/list
// tools/call
// notifications/tools/list_changed
// logging/setLevel
// notifications/message
// sampling/createMessage
// completion/complete
// roots/list
// notifications/roots/list_changed

const querySchema = v.object({
    cursor: v.optional(v.string()),
});

const responseSchema = v.object({
    resources: v.array(v.object({
        uri: v.string(),
        mimeType: v.string(),
        name: v.string(),
    })),
});

const openapi = describeRoute({
    description: 'Resources List',
    tags: ['MCP'],
    security: [{ ApiKeyAuth: [] }],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': { schema: resolver(responseSchema) },
            },
        }
    },
})

route.get('/resources/list', openapi, validator('query', querySchema), async (c) => {
    const query = `
    SELECT 1 + 1`;
    return makeUsageQuery(c, [query]);
});

export default route;