import { type Context, Hono } from 'hono';
import './src/banner.js';
import { openAPISpecs } from 'hono-openapi';
import { APP_DESCRIPTION, APP_VERSION, config } from './src/config.js';
import { logger } from './src/logger.js';
import routes from './src/routes/index.js';
import { APIErrorResponse } from './src/utils.js';

const app = new Hono();

// -----------
// --- API ---
// -----------
app.route('/', routes);

// ------------
// --- Docs ---
// ------------
app.get('/', () => new Response(Bun.file('./public/index.html')));
app.get('/favicon.svg', () => new Response(Bun.file('./public/favicon.svg')));
app.get('/banner.jpg', () => new Response(Bun.file('./public/banner.jpg')));
app.get(
    '/openapi',
    openAPISpecs(app, {
        documentation: {
            info: {
                title: 'Token API (Beta)',
                version: APP_VERSION,
                description: 'Power your apps & AI agents with real-time token data.',
            },
            servers: config.disableOpenapiServers
                ? [{ url: `http://${config.hostname}:${config.port}`, description: `${APP_DESCRIPTION} - Local` }]
                : [{ url: config.apiUrl, description: `${APP_DESCRIPTION} - Remote` }],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
        },
    })
);

// Tracking all incoming requests
app.use(async (c: Context, next) => {
    const pathname = c.req.path;
    logger.trace(`Incoming request: [${pathname}]`);
    await next();
});

// 404 NOT FOUND
app.notFound((c: Context) =>
    APIErrorResponse(c, 404, 'route_not_found', `Path not found: ${c.req.method} ${c.req.path}`)
);

export default {
    ...app,
    idleTimeout: config.idleTimeout,
};
