import { Context } from "hono";
import { APIErrorResponse } from "./utils.js";
import { makeQuery } from "./clickhouse/makeQuery.js";
import { DEFAULT_LIMIT, DEFAULT_OFFSET } from "./config.js";
import { ApiErrorResponse, limitSchema, offsetSchema } from "./types/zod.js";

export async function handleUsageQueryError(ctx: Context, result: any) {
    if (result.status !== 200 as ApiErrorResponse["status"]) {
        return APIErrorResponse(ctx, result.status as ApiErrorResponse["status"], result.code as ApiErrorResponse["code"], result.message);
    }
    return ctx.json(result);
}

// backwards compatible
export async function makeUsageQuery(ctx: Context, query: string[], query_params: Record<string, string | number> = {}, database: string) {
    const result = await makeUsageQueryJson(ctx, query, query_params, database);
    if (result.status !== 200 as ApiErrorResponse["status"]) {
        return APIErrorResponse(ctx, result.status as ApiErrorResponse["status"], result.code as ApiErrorResponse["code"], result.message);
    }
    return ctx.json(result);
}

export async function makeUsageQueryJson<T = unknown>(ctx: Context, query: string[], query_params: Record<string, string | number> = {}, database: string) {
    // pagination
    const limit = limitSchema.safeParse(ctx.req.query("limit")).data ?? DEFAULT_LIMIT;
    query.push('LIMIT {limit: int}');
    query_params.limit = limit;

    const offset = offsetSchema.safeParse(ctx.req.query("offset")).data ?? DEFAULT_OFFSET;
    query.push('OFFSET {offset: int}');
    query_params.offset = offset;

    // start of request
    const request_time = new Date();

    // inject request query params
    query_params = { ...ctx.req.param(), ...ctx.req.query(), ...query_params };

    try {
        const result = await makeQuery<T>(query.join(" "), query_params, database);
        if (result.data.length === 0) {
            return {
                status: 404 as ApiErrorResponse["status"],
                code: "not_found_data" as ApiErrorResponse["code"],
                message: 'No data found'
            };
        }
        return {
            data: result.data,
            status: 200 as ApiErrorResponse["status"],
            meta: {
                statistics: result.statistics ?? null,
                rows: result.rows ?? 0,
                rows_before_limit_at_least: result.rows_before_limit_at_least ?? 0,
                request_time,
                duration_ms: Number(new Date()) - Number(request_time),
            }
        };
    } catch (err) {
        return {
            status: 500 as ApiErrorResponse["status"],
            code: "bad_database_response" as ApiErrorResponse["code"],
            message: err
        };
    }
}
