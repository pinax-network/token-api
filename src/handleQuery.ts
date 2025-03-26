import { Context } from "hono";
import { APIErrorResponse, computePagination } from "./utils.js";
import { makeQuery } from "./clickhouse/makeQuery.js";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "./config.js";
import { ApiErrorResponse, ApiUsageResponse, limitSchema, pageSchema } from "./types/zod.js";
import { WebClickHouseClientConfigOptions } from "@clickhouse/client-web/dist/config.js";

export async function handleUsageQueryError(ctx: Context, result: ApiUsageResponse | ApiErrorResponse) {
    if ('status' in result) {
        return APIErrorResponse(
            ctx,
            result.status,
            result.code,
            result.message
        );
    }

    return ctx.json(result);
}

// backwards compatible
export async function makeUsageQuery(
    ctx: Context,
    query: string[],
    query_params: Record<string, string | number> = {},
    overwrite_config?: WebClickHouseClientConfigOptions
) {
    const result = await makeUsageQueryJson(ctx, query, query_params, overwrite_config);
    return await handleUsageQueryError(ctx, result);
}

export async function makeUsageQueryJson<T = unknown>(
    ctx: Context,
    query: string[],
    query_params: Record<string, string | number | string[]> = {},
    overwrite_config?: WebClickHouseClientConfigOptions
): Promise<ApiUsageResponse | ApiErrorResponse> {
    const limit = limitSchema.safeParse(ctx.req.query("limit")).data ?? DEFAULT_LIMIT;
    query.push('LIMIT {limit: int}');
    query_params.limit = limit;

    const page = pageSchema.safeParse(ctx.req.query("page")).data ?? DEFAULT_PAGE;
    query.push('OFFSET {offset: int}');
    // Since `page` starts at 1, `offset` should be positive for page > 1
    query_params.offset = query_params.limit * (page - 1);

    // start of request
    const request_time = new Date();

    // inject request query params
    query_params = { ...ctx.req.param(), ...ctx.req.query(), ...query_params };

    try {
        const result = await makeQuery<T>(query.join(" "), query_params, overwrite_config);
        if (result.data.length === 0) {
            return {
                status: 404 as ApiErrorResponse["status"],
                code: "not_found_data" as ApiErrorResponse["code"],
                message: 'No data found'
            };
        }

        const total_results = result.rows_before_limit_at_least ?? 0;
        return {
            data: result.data,
            statistics: result.statistics ?? {},
            pagination: computePagination(page, limit, total_results),
            results: result.rows ?? 0,
            total_results,
            request_time,
            duration_ms: Number(new Date()) - Number(request_time),
        };
    } catch (err) {
        return {
            status: 500 as ApiErrorResponse["status"],
            code: "bad_database_response" as ApiErrorResponse["code"],
            message: `${err}`
        };
    }
}
