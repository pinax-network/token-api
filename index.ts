import { Hono, type Context } from "hono";
import { SafeParseSuccess, z } from 'zod';

import client from './src/clickhouse/client.js';
import openapi from "./static/@typespec/openapi3/openapi.json" with { type: "json" };
import { APP_VERSION, config } from "./src/config.js";
import * as prometheus from './src/prometheus.js';
import { logger } from './src/logger.js';
import { makeUsageQuery } from "./src/usage.js";
import { APIErrorResponse } from "./src/utils.js";
import { usageOperationsToEndpointsMap, type EndpointReturnTypes, type UsageEndpoints, type ValidPathParams, type ValidUserParams } from "./src/types/api.js";
import { MonitoringHeadQueryResponseSchema, paths } from './src/types/zod.gen.js';
import { makeQuery } from "./src/clickhouse/makeQuery.js";

async function AntelopeTokenAPI() {
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

    // --------------------------
    // --- REST API endpoints ---
    // --------------------------
    const createUsageEndpoint = (endpoint: UsageEndpoints) => app.get(
        // Hono using different syntax than OpenAPI for path parameters
        // `/{path_param}` (OpenAPI) VS `/:path_param` (Hono)
        endpoint.replace(/{([^}]+)}/g, ":$1"),
        async (ctx: Context) => {
            // Use `unknown` for undefined schemas definitions in `zod.gen.ts`
            const path_params_schema = paths[endpoint]["get"]["parameters"]["path"] ?? z.unknown();
            const query_params_schema = z.preprocess(
                (q: any) => {
                    // Preprocess block ranges to array so Zod can parse it
                    if (q.block_range)
                        q.block_range = q.block_range.split(',');

                    return q;
                },
                paths[endpoint]["get"]["parameters"]["query"] ?? z.unknown()
            )
                // Zod post-processing
                .transform((q: any) => {
                    const addresses = ['contract', 'account', 'from', 'to'];

                    // Drop the '0x' from valid addresses
                    for (const prop of addresses) {
                        if (q[prop] && typeof q[prop] === 'string' && q[prop].toLowerCase().startsWith('0x'))
                            q[prop] = q[prop].substring(2);
                    }

                    return q;
                });

            const path_params = path_params_schema.safeParse(ctx.req.param());
            const query_params = query_params_schema.safeParse(ctx.req.query());

            if (path_params.success && query_params.success) {
                return makeUsageQuery(
                    ctx,
                    endpoint,
                    {
                        ...path_params.data as SafeParseSuccess<ValidPathParams<typeof endpoint>>,
                        ...query_params.data
                    } as ValidUserParams<typeof endpoint>
                );
            } else {
                // Merge path and query params errors into one `ZodError` instance
                const e = new z.ZodError([]);
                e.addIssues(path_params.error?.issues);
                e.addIssues(query_params.error?.issues);

                return APIErrorResponse(ctx, 400, "bad_query_input", e);
            }
        }
    );

    // Create all API endpoints interacting with DB
    Object.values(usageOperationsToEndpointsMap).forEach(e => createUsageEndpoint(e));

    // -------------
    // --- Miscs ---
    // -------------

    app.notFound((ctx: Context) => APIErrorResponse(ctx, 404, "route_not_found", `Path not found: ${ctx.req.method} ${ctx.req.path}`));

    return app;
}

export default {
    ...await AntelopeTokenAPI(),
    idleTimeout: config.requestIdleTimeout
};