import { Hono, type Context } from "hono";
import { APP_NAME, APP_VERSION, config } from "./src/config.js";
import * as prometheus from './src/prometheus.js';
import { logger } from './src/logger.js';
import { openAPISpecs } from 'hono-openapi';
import routes from './src/routes/index.js';
import { APIErrorResponse } from "./src/utils.js";
import { startMcpServer } from "./src/mcp/index.js";

// Start MCP server
await startMcpServer().catch((error) => {
    console.error("Error starting MCP server:", error);
});

const app = new Hono();

// -----------
// --- API ---
// -----------
app.route('/', routes);

// ------------
// --- Docs ---
// ------------
app.get("/", () => new Response(Bun.file("./public/index.html")));
app.get("/favicon.ico", () => new Response(Bun.file("./public/favicon.ico")));
app.get('/openapi', openAPISpecs(app, {
    documentation: {
        info: {
            title: 'Pinax Token API (Beta)',
            version: APP_VERSION.version,
            description: 'Collection of SQL based APIs by built on top of Pinax MCP Server (powered by Substreams).',
        },
        servers: [
            { url: config.openapiServerUrl, description: APP_NAME },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            }
        }
    },
}));

// Tracking all incoming requests
app.use(async (c: Context, next) => {
    const pathname = c.req.path;
    logger.trace(`Incoming request: [${pathname}]`);
    prometheus.requests.inc({ pathname });
    await next();
});

// 404 NOT FOUND
app.notFound((c: Context) => APIErrorResponse(c, 404, "route_not_found", `Path not found: ${c.req.method} ${c.req.path}`));

export default {
    ...app,
    idleTimeout: config.requestIdleTimeout
};
