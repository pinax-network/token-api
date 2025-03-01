import { z } from "zod";

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

// ----------------------
// API Responses
// ----------------------
export const apiErrorResponse = z.object({
    "status": z.union([z.literal(500), z.literal(504), z.literal(400), z.literal(401), z.literal(403), z.literal(404), z.literal(405)]),
    "code": z.enum(["bad_database_response", "bad_header", "missing_required_header", "bad_query_input", "database_timeout", "forbidden", "internal_server_error", "method_not_allowed", "route_not_found", "unauthorized", "not_found_data"]),
    "message": z.coerce.string()
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponse>;

export const paginationResponse = z.object({
    "next_page": z.coerce.number().int(),
    "previous_page": z.coerce.number().int(),
    "total_pages": z.coerce.number().int(),
    "total_results": z.coerce.number().int()
});
export type PaginationResponse = z.infer<typeof paginationResponse>;

export const statisticsResponse = z.object({
    "elapsed": z.coerce.number(),
    "rows_read": z.coerce.number().int(),
    "bytes_read": z.coerce.number().int()
});
export type StatisticsResponse = z.infer<typeof statisticsResponse>;

export const metadataResponse = z.object({
    "statistics": z.lazy(() => statisticsResponse).nullable(),
    paginationResponse
});
export type MetadataResponse = z.infer<typeof metadataResponse>;

export const versionResponse = z.object({
    "version": version,
    "commit": commit
});
export type VersionResponse = z.infer<typeof versionResponse>;

export const operations = {
    "Monitoring_head": {
        request: undefined,
        parameters: {
            path: undefined,
            query: undefined,
            header: undefined
        },
        responses: {
            200: blockNumHash,
            default: blockNumHash
        },
        errors: {}
    }, "Monitoring_health": {
        request: undefined,
        parameters: {
            path: undefined,
            query: undefined,
            header: undefined
        },
        responses: {
            200: z.coerce.string(),
            default: z.coerce.string()
        },
        errors: {}
    }, "Monitoring_metrics": {
        request: undefined,
        parameters: {
            path: undefined,
            query: undefined,
            header: undefined
        },
        responses: {
            200: z.coerce.string(),
            default: z.coerce.string()
        },
        errors: {}
    }, "Docs_openapi": {
        request: undefined,
        parameters: {
            path: undefined,
            query: undefined,
            header: undefined
        },
        responses: {
            200: z.any(),
            default: z.any()
        },
        errors: {}
    }, "Docs_version": {
        request: undefined,
        parameters: {
            path: undefined,
            query: undefined,
            header: undefined
        },
        responses: {
            200: version,
            default: version
        },
        errors: {}
    } } as const;

export const paths = {
        "/head": {
        get: operations["Monitoring_head"]
    }, "/health": {
        get: operations["Monitoring_health"]
    }, "/metrics": {
        get: operations["Monitoring_metrics"]
    }, "/openapi": {
        get: operations["Docs_openapi"]
    }, "/version": {
        get: operations["Docs_version"]
    } } as const;