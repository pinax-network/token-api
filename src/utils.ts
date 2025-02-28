import { ZodError } from "zod";

import type { Context } from "hono";
import type { ApiErrorSchema } from "./types/zod.gen.js";
import { logger } from "./logger.js";
import * as prometheus from "./prometheus.js";

export function APIErrorResponse(ctx: Context, status: ApiErrorSchema["status"], code: ApiErrorSchema["code"], err: unknown) {
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
    prometheus.requests_errors.inc({ pathname: ctx.req.path, status });

    return ctx.json<ApiErrorSchema, typeof status>(api_error, status);
}