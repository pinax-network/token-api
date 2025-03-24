import { z } from "zod";
import { DEFAULT_AGE, DEFAULT_LIMIT, DEFAULT_MAX_AGE, DEFAULT_NETWORK_ID } from "../config.js";

// ----------------------
// Common schemas
// ----------------------
export const evmAddress = z.coerce.string().regex(new RegExp("^(0[xX])?[0-9a-fA-F]{40}$"));
export type EvmAddress = z.infer<typeof evmAddress>;

export const blockNumHash = z.object({
    "block_num": z.coerce.number().int(),
    "block_hash": z.coerce.string()
});
export type BlockNumHash = z.infer<typeof blockNumHash>;

export const version = z.coerce.string().regex(new RegExp("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"));
export type Version = z.infer<typeof version>;

export const commit = z.coerce.string().regex(new RegExp("^[0-9a-f]{7}$"));
export type Commit = z.infer<typeof commit>;

// ----------------------
// API Query Params
// ----------------------
export const paginationQuery = z.object({
    "limit": z.coerce.number().int().default(10).optional(),
    "page": z.coerce.number().int().default(1).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

export const statisticsSchema = z.object({
    elapsed: z.optional(z.number()),
    rows_read: z.optional(z.number()),
    bytes_read: z.optional(z.number()),
});

export const paginationSchema = z.object({
    previous_page: z.coerce.number().int().min(1),
    current_page: z.coerce.number().int().min(1),
    next_page: z.coerce.number().int().min(1),
    total_pages: z.coerce.number().int().min(1),
}).refine(({ previous_page, current_page, next_page, total_pages }) =>
    previous_page <= current_page
    && current_page <= next_page
    && next_page <= total_pages
);
export type PaginationSchema = z.infer<typeof paginationSchema>;

export const evmAddressSchema = evmAddress.toLowerCase().transform((addr) => addr.length == 40 ? `0x${addr}` : addr).pipe(z.string());
// z.enum argument type definition requires at least one element to be defined
export const ageSchema = z.coerce.number().int().min(1).max(DEFAULT_MAX_AGE).default(DEFAULT_AGE);
export const limitSchema = z.coerce.number().int().min(1).max(500).default(DEFAULT_LIMIT);
export const pageSchema = z.coerce.number().int().min(1).default(1);

// ----------------------
// API Responses
// ----------------------
export const apiErrorResponse = z.object({
    "status": z.union([z.literal(500), z.literal(502), z.literal(504), z.literal(400), z.literal(401), z.literal(403), z.literal(404), z.literal(405)]),
    "code": z.enum(["bad_database_response", "connection_refused", "authentication_failed", "bad_header", "missing_required_header", "bad_query_input", "database_timeout", "forbidden", "internal_server_error", "method_not_allowed", "route_not_found", "unauthorized", "not_found_data"]),
    "message": z.coerce.string()
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponse>;

export const apiUsageResponse = z.object({
    data: z.array(z.any()),
    statistics: z.optional(statisticsSchema),
    pagination: paginationSchema,
    results: z.optional(z.number()),
    total_results: z.optional(z.number()),
    request_time: z.date(),
    duration_ms: z.number()
});
export type ApiUsageResponse = z.infer<typeof apiUsageResponse>;
