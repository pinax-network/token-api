import type { Context } from 'hono';
import type { ApiErrorResponse, ApiUsageResponse } from './types/zod.js';
import { APIErrorResponse } from './utils.js';

export async function handleUsageQueryError(ctx: Context, result: ApiUsageResponse | ApiErrorResponse) {
    if ('status' in result) {
        return APIErrorResponse(ctx, result.status, result.code, result.message);
    }

    return ctx.json(result);
}
