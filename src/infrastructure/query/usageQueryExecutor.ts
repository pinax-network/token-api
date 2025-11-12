import type { WebClickHouseClientConfigOptions } from '@clickhouse/client-web/dist/config.js';
import type { Context } from 'hono';
import { handleUsageQueryError, makeUsageQueryJson } from './usageQuery.js';
import type { ApiErrorResponse, ApiUsageResponse } from '../../types/zod.js';

export class UsageQueryExecutor {
    public async execute<T = unknown>(
        ctx: Context,
        queries: string[],
        params: Record<string, string | number | string[] | boolean>,
        options?: WebClickHouseClientConfigOptions
    ): Promise<ApiUsageResponse | ApiErrorResponse> {
        return makeUsageQueryJson<T>(ctx, queries, params, options);
    }

    public async send(
        ctx: Context,
        result: ApiUsageResponse | ApiErrorResponse
    ): Promise<Response> {
        return handleUsageQueryError(ctx, result);
    }
}
