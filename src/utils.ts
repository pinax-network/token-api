import { ZodError } from "zod";

import type { Context } from "hono";
import { ClientErrorResponse, clientErrorResponse, paginationSchema, ServerErrorResponse, serverErrorResponse, type ApiErrorResponse, type PaginationSchema } from "./types/zod.js";
import { logger } from "./logger.js";
import { resolver } from "hono-openapi/zod";

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

    if (status >= 500)
        return c.json<ServerErrorResponse, typeof status>(api_error as ServerErrorResponse, status);
    else
        return c.json<ClientErrorResponse, typeof status>(api_error as ClientErrorResponse, status);
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

export function validatorHook(parseResult: { success: true, data: any; } | { success: false, error: any; }, ctx: Context) {
    if (!parseResult.success)
        return APIErrorResponse(ctx, 400, "bad_query_input", parseResult.error);
    else
        ctx.set('validatedData', { ...ctx.get('validatedData'), ...parseResult.data });
}

// Wrapper function to add error responses to existing route descriptions
export function withErrorResponses(routeDescription: any) {
    return {
        ...routeDescription,
        responses: {
            ...routeDescription.responses,
            400: {
                description: 'Client side error',
                content: {
                    'application/json': {
                        schema: resolver(clientErrorResponse),
                        example: {
                            status: 400,
                            code: "bad_query_input",
                            message: "Invalid query parameter provided"
                        }
                    }
                }
            },
            401: {
                description: 'Authentication failed',
                content: {
                    'application/json': {
                        schema: resolver(clientErrorResponse),
                        example: {
                            status: 401,
                            code: "unauthorized",
                            message: "Authentication required"
                        }
                    }
                }
            },
            403: {
                description: 'Forbidden',
                content: {
                    'application/json': {
                        schema: resolver(clientErrorResponse),
                        example: {
                            status: 403,
                            code: "forbidden",
                            message: "Access denied"
                        }
                    }
                }
            },
            404: {
                description: 'Not found',
                content: {
                    'application/json': {
                        schema: resolver(clientErrorResponse),
                        example: {
                            status: 404,
                            code: "not_found_data",
                            message: "Resource not found"
                        }
                    }
                }
            },
            500: {
                description: 'Server side error',
                content: {
                    'application/json': {
                        schema: resolver(serverErrorResponse),
                        example: {
                            status: 500,
                            code: "internal_server_error",
                            message: "An unexpected error occurred"
                        }
                    }
                }
            }
        }
    };
}