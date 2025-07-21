import { SafeParseError, SafeParseSuccess, ZodError } from "zod";

import type { Context } from "hono";
import { paginationSchema, type ApiErrorResponse, type PaginationSchema } from "./types/zod.js";
import { logger } from "./logger.js";

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

    return c.json<ApiErrorResponse, typeof status>(api_error, status);
}

/**
 * Computes pagination information based on the current page, the number of rows per page, and the total number of rows.
 *
 * This function calculates:
 *  - `total_pages` as the maximum between 1 and the ceiling of `total_rows` divided by `rows_per_page`.
 *  - `previous_page` as one less than `current_page` if `current_page` is greater than 1; otherwise, it remains equal to `current_page`.
 *  - `next_page` as one more than `current_page` if the product (`current_page * rows_per_page`) is less than `total_rows`;
 *    otherwise, it remains equal to `current_page`.
 *
 * If `total_rows` is not provided, it defaults to 0.
 *
 * All the returned numeric values are coerced into integers and validated to be at least 1,
 * ensuring that: `previous_page <= current_page <= next_page <= total_pages`.
 *
 * @param current_page - The current active page (must be >= 1).
 * @param rows_per_page - The number of rows displayed per page.
 * @param total_rows - The total count of rows (defaults to 0 if omitted).
 * @returns An object with the keys: `previous_page`, `current_page`, `next_page`, and `total_pages`.
 * @throws {ZodError} if the computed pagination values do not satisfy the defined schema.
 */
export function computePagination(current_page: number, rows_per_page: number, total_rows?: number): PaginationSchema {
    total_rows ??= 0;
    return paginationSchema.parse({
        next_page: (current_page * rows_per_page >= total_rows) ? current_page : current_page + 1,
        current_page,
        previous_page: (current_page <= 1) ? current_page : current_page - 1,
        total_pages: Math.max(Math.ceil(total_rows / rows_per_page), 1),
    });
}

export function now() {
    return Math.floor(Date.now() / 1000);
}

export function validatorHook(parseResult: { success: true, data: any } | { success: false, error: any }, ctx: Context) {
    if (!parseResult.success)
        return APIErrorResponse(ctx, 400, "bad_query_input", parseResult.error);
    else
        ctx.set('validatedData', { ...ctx.get('validatedData'), ...parseResult.data });
}