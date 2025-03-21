import { ZodError } from "zod";

import type { Context } from "hono";
import type { ApiErrorResponse, PaginationSchema } from "./types/zod.js";
import { logger } from "./logger.js";
import * as prometheus from "./prometheus.js";

export function APIErrorResponse(c: Context, status: ApiErrorResponse["status"], code: ApiErrorResponse["code"], err: unknown) {
    let message = "An unexpected error occured";

    if (typeof err === "string") {
        message = err;
    } else if (err instanceof ZodError) {
        message = err.issues.map(issue => `[${issue.code}] ${issue.path.join('/')}: ${issue.message}`).join(' | ');
    } else if (err instanceof Error) {
        message = err.message;
    }

    const api_error = {
        status,
        code,
        message
    };

    logger.error(api_error);
    prometheus.requests_errors.inc({ pathname: c.req.path, status });

    return c.json<ApiErrorResponse, typeof status>(api_error, status);
}

export function computePagination(current_page: number, rows_per_page: number, total_rows?: number): PaginationSchema {
    total_rows ??= 0;
    return {
        next_page: (current_page * rows_per_page >= total_rows) ? current_page : current_page + 1,
        current_page,
        previous_page: (current_page <= 1) ? current_page : current_page - 1,
        total_pages: Math.max(Math.ceil(total_rows / rows_per_page), 1),
    }
}