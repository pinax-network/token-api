import type { Context } from 'hono';
import { resolver } from 'hono-openapi/zod';
import { ZodError } from 'zod';
import { config } from './config.js';
import { logger } from './logger.js';
import {
    type ApiErrorResponse,
    type ClientErrorResponse,
    clientErrorResponseSchema,
    type ServerErrorResponse,
    serverErrorResponseSchema,
} from './types/zod.js';

export function APIErrorResponse(
    c: Context,
    status: ApiErrorResponse['status'],
    code: ApiErrorResponse['code'],
    err: unknown
) {
    let message = 'An unexpected error occured';

    if (typeof err === 'string') {
        message = err;
    } else if (err instanceof ZodError) {
        message = err.issues.map((issue) => `[${issue.code}] ${issue.path.join('/')}: ${issue.message}`).join(' | ');
    } else if (err instanceof Error) {
        message = err.message;
    }

    let api_error = {
        status,
        code,
        message,
    };

    logger.error(api_error);

    // Handle query execution timeout
    if (message.includes('Timeout')) {
        api_error = {
            status: 504 as ServerErrorResponse['status'],
            code: 'database_timeout' as ServerErrorResponse['code'],
            message: 'Query took too long. Consider applying more filter parameters if possible.',
        };
    }

    if (api_error.status >= 500)
        return c.json<ServerErrorResponse, typeof status>(api_error as ServerErrorResponse, api_error.status);

    return c.json<ClientErrorResponse, typeof status>(api_error as ClientErrorResponse, api_error.status);
}

export function now() {
    return Math.floor(Date.now() / 1000);
}

export function getDateMinusMonths(months: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().substring(0, 10);
}

export function validatorHook(
    parseResult:
        | {
              success: true;
              data: {
                  limit?: number;
                  start_time?: number;
                  end_time?: number;
              } & {
                  [key: string]: unknown | unknown[];
              };
          }
        | { success: false; error: unknown },
    ctx: Context
) {
    if (!parseResult.success) return APIErrorResponse(ctx, 400, 'bad_query_input', parseResult.error);

    const plan = ctx.req.header('X-Plan');

    // Bypass plan limits if PLANS config is empty (local development)
    if (config.plans !== null) {
        if (!plan) return APIErrorResponse(ctx, 400, 'bad_header', `Missing 'X-Plan' header in request.`);

        const planConfig = config.plans.get(plan);
        if (!planConfig) {
            return APIErrorResponse(ctx, 400, 'bad_header', `'X-Plan' header has invalid value.`);
        }

        const max_limit: number = planConfig.maxLimit;
        const max_batched: number = planConfig.maxBatched;
        const max_depth_months: number = planConfig.maxDepthMonths;
        const data = parseResult.data;

        // Limit
        if (max_limit !== 0 && data.limit && data.limit > max_limit)
            return APIErrorResponse(ctx, 403, 'forbidden', `Parameter 'limit' exceeds maximum of ${max_limit} items.`);

        // Batched parameters
        const exceededParams = Object.entries(data)
            .filter(([_, value]) => Array.isArray(value) && value.length > max_batched)
            .map(([key, value]) => ({ name: key, length: (value as unknown[]).length }));

        if (max_batched !== 0 && exceededParams.length > 0) {
            const paramDetails = exceededParams.map((p) => `'${p.name}' (${p.length} values)`).join(', ');
            return APIErrorResponse(
                ctx,
                403,
                'forbidden',
                `Parameters ${paramDetails} exceed maximum batch limit of ${max_batched}.`
            );
        }

        // Historical depth for OHLCV
        const is_ohlcv_endpoint = ctx.req.path.endsWith('/ohlc') || ctx.req.path.endsWith('/historical');
        if (is_ohlcv_endpoint && max_depth_months !== 0 && data.start_time && data.end_time) {
            if (data.end_time < data.start_time)
                return APIErrorResponse(ctx, 400, 'bad_query_input', `'end_time' cannot be less than 'start_time'.`);

            // Clamp `end_time` to `now()` for month difference calculation
            const clampedEndTime = Math.min(data.end_time, now());
            const endDate = new Date(clampedEndTime * 1000);
            const cutoffDate = new Date(endDate);
            cutoffDate.setMonth(cutoffDate.getMonth() - max_depth_months);
            cutoffDate.setUTCHours(0);
            cutoffDate.setUTCMinutes(0);
            cutoffDate.setUTCSeconds(0);
            cutoffDate.setUTCMilliseconds(0);
            const startDate = new Date(data.start_time * 1000);

            // Check if start_time is before the cutoff date
            if (startDate < cutoffDate)
                return APIErrorResponse(
                    ctx,
                    403,
                    'forbidden',
                    `Parameters 'start_time', 'end_time' exceed maximum historical depth of ${max_depth_months} months.`
                );
        }
    }

    if (parseResult.data)
        ctx.set('validatedData', {
            ...(ctx.get('validatedData') || {}),
            ...parseResult.data,
        });
}

export interface RouteDescription {
    responses?: Record<string, unknown>;
    [key: string]: unknown;
}

// Wrapper function to add error responses to existing route descriptions
export function withErrorResponses(routeDescription: RouteDescription) {
    return {
        ...routeDescription,
        responses: {
            ...(routeDescription.responses || {}),
            400: {
                description: 'Client side error',
                content: {
                    'application/json': {
                        schema: resolver(clientErrorResponseSchema),
                        examples: {
                            example: {
                                value: {
                                    status: 400,
                                    code: 'bad_query_input',
                                    message: 'Invalid query parameter provided',
                                },
                            },
                        },
                    },
                },
            },
            401: {
                description: 'Authentication failed',
                content: {
                    'application/json': {
                        schema: resolver(clientErrorResponseSchema),
                        examples: {
                            example: {
                                value: {
                                    status: 401,
                                    code: 'unauthorized',
                                    message: 'Authentication required',
                                },
                            },
                        },
                    },
                },
            },
            403: {
                description: 'Forbidden',
                content: {
                    'application/json': {
                        schema: resolver(clientErrorResponseSchema),
                        examples: {
                            example: {
                                value: {
                                    status: 403,
                                    code: 'forbidden',
                                    message: 'Access denied',
                                },
                            },
                        },
                    },
                },
            },
            404: {
                description: 'Not found',
                content: {
                    'application/json': {
                        schema: resolver(clientErrorResponseSchema),
                        examples: {
                            example: {
                                value: {
                                    status: 404,
                                    code: 'not_found_data',
                                    message: 'Resource not found',
                                },
                            },
                        },
                    },
                },
            },
            500: {
                description: 'Server side error',
                content: {
                    'application/json': {
                        schema: resolver(serverErrorResponseSchema),
                        examples: {
                            example: {
                                value: {
                                    status: 500,
                                    code: 'internal_server_error',
                                    message: 'An unexpected error occurred',
                                },
                            },
                        },
                    },
                },
            },
        },
    };
}

/**
 * Executes a promise with a timeout. If the promise does not resolve within the specified timeout,
 * it will reject with a timeout error.
 * @param promise The promise to execute with timeout
 * @param timeoutMs Timeout in milliseconds
 * @param errorMsg Optional custom error message for timeout
 * @returns Promise that resolves with the original promise result or rejects on timeout
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg = 'Operation timed out'): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
        }),
    ]);
}
