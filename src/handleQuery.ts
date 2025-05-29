import { Context } from "hono";
import { APIErrorResponse, computePagination } from "./utils.js";
import { makeQuery } from "./clickhouse/makeQuery.js";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "./config.js";
import { ApiErrorResponse, ApiUsageResponse, limitSchema, pageSchema } from "./types/zod.js";
import { WebClickHouseClientConfigOptions } from "@clickhouse/client-web/dist/config.js";
import { MAX_EXECUTION_TIME } from "./clickhouse/client.js";

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
    query_params.limit = limit;

    const page = pageSchema.safeParse(ctx.req.query("page")).data ?? DEFAULT_PAGE;
    // Since `page` starts at 1, `offset` should be positive for page > 1
    query_params.offset = query_params.limit * (page - 1);

    // start of request
    const request_time = new Date();

    // inject request query params
    query_params = { ...ctx.req.param(), ...ctx.req.query(), ...query_params };

    try {
        const result = await makeQuery<T>(query.join(" "), query_params, overwrite_config);

        // Handle query execution timeout
        if (result.statistics && result.statistics.elapsed >= MAX_EXECUTION_TIME) {
            return {
                status: 500 as ApiErrorResponse["status"],
                code: "database_timeout" as ApiErrorResponse["code"],
                message: 'Query took too long. Consider applying startTime and endTime filters.'
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
        let message: string;
        const filter_error_messages = ['Unknown', 'does not exist']
  
        if (err instanceof Error)
            message = err.message;
        else if (typeof err === 'string')
            message = err;
        else
            message = 'An unknown error occurred';

        if (filter_error_messages.some(w => message.includes(w)))
            message = 'Endpoint is currently not supported for this network';

        return {
            status: 500 as ApiErrorResponse["status"],
            code: "bad_database_response" as ApiErrorResponse["code"],
            message
        };
    }
}
