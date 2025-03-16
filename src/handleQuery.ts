import { Context } from "hono";
import { APIErrorResponse } from "./utils.js";
import { makeQuery } from "./clickhouse/makeQuery.js";

export async function makeUsageQuery(ctx: Context, query: string[], query_params: Record<string, string | number> = {}, database: string) {
    // pagination
    if (!query_params['limit']) {
        query.push('LIMIT {limit: int}');
        query_params.limit = 10;
    }
    if (!query_params['offset']) {
        query.push('OFFSET {offset: int}');
        query_params.offset = 0;
    }

    const request_time = new Date();

    // inject request query params
    query_params = { ...ctx.req.param(), ...ctx.req.query(), ...query_params };

    try {
        const result = await makeQuery(query.join(" "), query_params, database);
        if (result.data.length === 0) {
            return APIErrorResponse(ctx, 404, "not_found_data", `No data found`);
        }
        return ctx.json({
            data: result.data,
            meta: {
                statistics: result.statistics ?? null,
                rows: result.rows ?? 0,
                rows_before_limit_at_least: result.rows_before_limit_at_least ?? 0,
                request_time,
                duration_ms: Number(new Date()) - Number(request_time),
            }
        });
    } catch (err) {
        return APIErrorResponse(ctx, 500, "bad_database_response", err);
    }
}