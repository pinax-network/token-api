import type { WebClickHouseClientConfigOptions } from '@clickhouse/client-web/dist/config.js';
import type { Context } from 'hono';
import { ZodError } from 'zod';
import { makeQuery } from './clickhouse/makeQuery.js';
import { config, DEFAULT_LIMIT, DEFAULT_PAGE } from './config.js';
import {
    type ApiErrorResponse,
    type ApiUsageResponse,
    type ClientErrorResponse,
    limitSchema,
    pageSchema,
    type ServerErrorResponse,
} from './types/zod.js';
import { APIErrorResponse, computePagination } from './utils.js';

export async function handleUsageQueryError(ctx: Context, result: ApiUsageResponse | ApiErrorResponse) {
    if ('status' in result) {
        return APIErrorResponse(ctx, result.status, result.code, result.message);
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
    const request_time = new Date();
    const limit = limitSchema.safeParse(ctx.req.query('limit')).data ?? DEFAULT_LIMIT;
    const page = pageSchema.safeParse(ctx.req.query('page')).data ?? DEFAULT_PAGE;

    // inject request query params
    const params = {
        ...ctx.req.param(),
        ...ctx.req.query(),
        ...query_params,
        // Since `page` starts at 1, `offset` should be positive for page > 1
        offset: limit * (page - 1),
        limit,
    };

    try {
        const result = await makeQuery<T>(query.join(' '), params, overwrite_config);

        // Sometimes the timings will not make ClickHouse return a timeout error even though the data is empty
        if (
            result.data.length === 0 &&
            result.statistics &&
            result.statistics?.elapsed >= config.maxQueryExecutionTime
        ) {
            return {
                status: 504 as ServerErrorResponse['status'],
                code: 'database_timeout' as ServerErrorResponse['code'],
                message: 'Query took too long. Consider applying more filter parameters if possible.',
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
            duration_ms: Date.now() - Number(request_time),
        };
    } catch (err) {
        let message: string;
        const _filter_error_messages = ['Unknown', 'does not exist'];

        if (err instanceof ZodError)
            return {
                status: 400 as ClientErrorResponse['status'],
                code: 'bad_query_input' as ClientErrorResponse['code'],
                message: err.issues[0]?.message ?? 'An unknown error occurred',
            };
        if (err instanceof Error) message = err.message;
        else if (typeof err === 'string') message = err;
        else message = 'An unknown error occurred';

        // if (filter_error_messages.some(w => message.includes(w)))
        //     message = 'Endpoint is currently not supported for this network';

        return {
            status: 500 as ServerErrorResponse['status'],
            code: 'bad_database_response' as ServerErrorResponse['code'],
            message,
        };
    }
}
