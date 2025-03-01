import { Hono, type Context } from "hono";
import openapi from "./static/@typespec/openapi3/openapi.json" with { type: "json" };
import { APP_VERSION, config } from "./src/config.js";
import * as prometheus from './src/prometheus.js';
import { logger } from './src/logger.js';
import { APIErrorResponse } from "./src/utils.js";
import * as routes from "./src/routes/index.js";

async function App() {
    const app = new Hono();
    // --------------
    // --- Routes ---
    // --------------
    app.get("/token/balances/evm/:address", routes.token.balances.evm.default);
    app.get("/token/transfers/evm/:address", routes.token.transfers.evm.default);
    app.get("/token/holders/evm/:contract", routes.token.holders.evm.default);

    // ------------
    // --- Docs ---
    // ------------
    app.get("/", () => new Response(Bun.file("./stoplight/index.html")));
    app.get("/favicon.ico", () => new Response(Bun.file("./stoplight/favicon.ico")));
    app.get("/openapi", async (ctx: Context) => ctx.json(openapi));

    // ------------------
    // --- Monitoring ---
    // ------------------
    app.get("/version", async (ctx: Context) => ctx.json(APP_VERSION));
    app.get("/health", routes.health.default);
    app.get("/metrics", async () => new Response(await prometheus.registry.metrics()));
    app.notFound((ctx: Context) => APIErrorResponse(ctx, 404, "route_not_found", `Path not found: ${ctx.req.method} ${ctx.req.path}`));

    // Tracking all incoming requests
    app.use(async (ctx: Context, next) => {
        const pathname = ctx.req.path;
        logger.trace(`Incoming request: [${pathname}]`);
        prometheus.requests.inc({ pathname });
        await next();
    });

    return app;
}

export default {
    ...await App(),
    idleTimeout: config.requestIdleTimeout
};