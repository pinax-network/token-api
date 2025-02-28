import { Hono, type Context } from "hono";
import client from './src/clickhouse/client.js';
import openapi from "./static/@typespec/openapi3/openapi.json" with { type: "json" };
import { APP_VERSION, config } from "./src/config.js";
import * as prometheus from './src/prometheus.js';
import { logger } from './src/logger.js';
import { APIErrorResponse } from "./src/utils.js";
import { type EndpointReturnTypes } from "./src/types/api.js";
import { MonitoringHeadQueryResponseSchema, paths } from './src/types/zod.gen.js';
import { makeQuery } from "./src/clickhouse/makeQuery.js";
import * as routes from "./src/routes/index.js";

async function TokenAPI() {
    const app = new Hono();

    // Tracking all incoming requests
    app.use(async (ctx: Context, next) => {
        const pathname = ctx.req.path;
        logger.trace(`Incoming request: [${pathname}]`);
        prometheus.requests.inc({ pathname });

        await next();
    });

    // ---------------
    // --- Swagger ---
    // ---------------

    app.get(
        "/",
        async (_) => new Response(Bun.file("./stoplight/index.html"))
    );

    app.get(
        "/favicon.ico",
        async (_) => new Response(Bun.file("./stoplight/favicon.ico"))
    );

    // ------------
    // --- Docs ---
    // ------------

    app.get(
        "/openapi",
        async (ctx: Context) => ctx.json<{ [key: string]: EndpointReturnTypes<"/openapi">; }, 200>(openapi)
    );

    app.get(
        "/version",
        async (ctx: Context) => ctx.json<EndpointReturnTypes<"/version">, 200>(APP_VERSION)
    );

    // ------------------
    // --- Monitoring ---
    // ------------------
    app.get(
        "/head",
        async (ctx: Context) => {
            try {
                const head = (
                    await makeQuery<MonitoringHeadQueryResponseSchema>("SELECT block_num, block_id as block_hash FROM cursors FINAL")
                ).data[0];

                if (head)
                    return ctx.json<EndpointReturnTypes<"/head">, 200>(head);
            } catch (err) {
                return APIErrorResponse(ctx, 500, "bad_database_response", err);
            }
        }
    );

    app.get(
        "/health",
        async (ctx: Context) => {
            const response = await client.ping();

            if (!response.success) {
                return APIErrorResponse(ctx, 500, "bad_database_response", response.error.message);
            }

            return new Response("OK");
        }
    );


    app.get(
        "/metrics",
        async () => new Response(await prometheus.registry.metrics())
    );

    // ------------------
    // --- Routes     ---
    // ------------------
    app.get("/account/balances/:address", routes.account.balances);
    app.get("/account/transfers/:address", routes.account.transfers);

    // -------------
    // --- Miscs ---
    // -------------
    app.notFound((ctx: Context) => APIErrorResponse(ctx, 404, "route_not_found", `Path not found: ${ctx.req.method} ${ctx.req.path}`));

    return app;
}

export default {
    ...await TokenAPI(),
    idleTimeout: config.requestIdleTimeout
};