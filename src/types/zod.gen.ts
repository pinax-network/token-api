import { z } from "zod";


export const apiErrorSchema = z.object({ "status": z.union([z.literal(500), z.literal(504), z.literal(400), z.literal(401), z.literal(403), z.literal(404), z.literal(405)]), "code": z.enum(["bad_database_response", "bad_header", "missing_required_header", "bad_query_input", "database_timeout", "forbidden", "internal_server_error", "method_not_allowed", "route_not_found", "unauthorized", "not_found_data"]), "message": z.coerce.string() });
export type ApiErrorSchema = z.infer<typeof apiErrorSchema>;


export const balanceSchema = z.object({ "last_updated_block": z.coerce.number().int(), "contract": z.lazy(() => modelsAddressSchema), "balance": z.coerce.number().int() });
export type BalanceSchema = z.infer<typeof balanceSchema>;


export const balanceChangeSchema = z.object({ "block_num": z.coerce.number().int(), "block_hash": z.coerce.string(), "timestamp": z.coerce.string(), "transaction_id": z.coerce.string(), "call_index": z.coerce.number().int(), "log_index": z.coerce.number().int(), "log_block_index": z.coerce.number().int(), "log_ordinal": z.coerce.number().int(), "storage_key": z.coerce.string(), "storage_ordinal": z.coerce.number().int(), "from": z.lazy(() => modelsAddressSchema), "to": z.lazy(() => modelsAddressSchema), "value": z.coerce.number().int(), "contract": z.lazy(() => modelsAddressSchema), "owner": z.lazy(() => modelsAddressSchema), "old_balance": z.coerce.number().int(), "new_balance": z.coerce.number().int(), "version": z.coerce.number().int() });
export type BalanceChangeSchema = z.infer<typeof balanceChangeSchema>;


export const blockRangeSchema = z.array(z.coerce.number().int()).max(2);
export type BlockRangeSchema = z.infer<typeof blockRangeSchema>;


export const modelsAddressSchema = z.coerce.string().regex(new RegExp("^(0[xX])?[0-9a-fA-F]{40}$"));
export type ModelsAddressSchema = z.infer<typeof modelsAddressSchema>;


export const paginationSchema = z.object({ "next_page": z.coerce.number().int(), "previous_page": z.coerce.number().int(), "total_pages": z.coerce.number().int(), "total_results": z.coerce.number().int() });
export type PaginationSchema = z.infer<typeof paginationSchema>;


export const queryStatisticsSchema = z.object({ "elapsed": z.coerce.number(), "rows_read": z.coerce.number().int(), "bytes_read": z.coerce.number().int() });
export type QueryStatisticsSchema = z.infer<typeof queryStatisticsSchema>;


export const responseMetadataSchema = z.object({ "statistics": z.lazy(() => queryStatisticsSchema).nullable(), "next_page": z.coerce.number().int(), "previous_page": z.coerce.number().int(), "total_pages": z.coerce.number().int(), "total_results": z.coerce.number().int() });
export type ResponseMetadataSchema = z.infer<typeof responseMetadataSchema>;


export const versionSchema = z.object({ "version": z.coerce.string().regex(new RegExp("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$")), "commit": z.coerce.string().regex(new RegExp("^[0-9a-f]{7}$")) });
export type VersionSchema = z.infer<typeof versionSchema>;


export const usageBalanceQueryParamsSchema = z.object({ "account": z.lazy(() => modelsAddressSchema), "contract": z.lazy(() => modelsAddressSchema).optional(), "limit": z.coerce.number().int().default(10).optional(), "page": z.coerce.number().int().default(1).optional() });
export type UsageBalanceQueryParamsSchema = z.infer<typeof usageBalanceQueryParamsSchema>;
/**
 * @description Array of balances.
 */
export const usageBalance200Schema = z.object({ "data": z.array(z.lazy(() => balanceSchema)), "meta": z.lazy(() => responseMetadataSchema) });
export type UsageBalance200Schema = z.infer<typeof usageBalance200Schema>;
/**
 * @description An unexpected error response.
 */
export const usageBalanceErrorSchema = z.lazy(() => apiErrorSchema);
export type UsageBalanceErrorSchema = z.infer<typeof usageBalanceErrorSchema>;
/**
 * @description Array of balances.
 */
export const usageBalanceQueryResponseSchema = z.object({ "data": z.array(z.lazy(() => balanceSchema)), "meta": z.lazy(() => responseMetadataSchema) });
export type UsageBalanceQueryResponseSchema = z.infer<typeof usageBalanceQueryResponseSchema>;


export const usageBalanceHistoricalQueryParamsSchema = z.object({ "account": z.lazy(() => modelsAddressSchema), "date": z.coerce.string(), "contract": z.lazy(() => modelsAddressSchema).optional(), "limit": z.coerce.number().int().default(10).optional(), "page": z.coerce.number().int().default(1).optional() });
export type UsageBalanceHistoricalQueryParamsSchema = z.infer<typeof usageBalanceHistoricalQueryParamsSchema>;
/**
 * @description Array of balances.
 */
export const usageBalanceHistorical200Schema = z.object({ "data": z.array(z.lazy(() => balanceChangeSchema)), "meta": z.lazy(() => responseMetadataSchema) });
export type UsageBalanceHistorical200Schema = z.infer<typeof usageBalanceHistorical200Schema>;
/**
 * @description An unexpected error response.
 */
export const usageBalanceHistoricalErrorSchema = z.lazy(() => apiErrorSchema);
export type UsageBalanceHistoricalErrorSchema = z.infer<typeof usageBalanceHistoricalErrorSchema>;
/**
 * @description Array of balances.
 */
export const usageBalanceHistoricalQueryResponseSchema = z.object({ "data": z.array(z.lazy(() => balanceChangeSchema)), "meta": z.lazy(() => responseMetadataSchema) });
export type UsageBalanceHistoricalQueryResponseSchema = z.infer<typeof usageBalanceHistoricalQueryResponseSchema>;

 /**
 * @description Head block information.
 */
export const monitoringHead200Schema = z.object({ "block_num": z.coerce.number().int(), "block_hash": z.coerce.string() });
export type MonitoringHead200Schema = z.infer<typeof monitoringHead200Schema>;
/**
 * @description An unexpected error response.
 */
export const monitoringHeadErrorSchema = z.lazy(() => apiErrorSchema);
export type MonitoringHeadErrorSchema = z.infer<typeof monitoringHeadErrorSchema>;
/**
 * @description Head block information.
 */
export const monitoringHeadQueryResponseSchema = z.object({ "block_num": z.coerce.number().int(), "block_hash": z.coerce.string() });
export type MonitoringHeadQueryResponseSchema = z.infer<typeof monitoringHeadQueryResponseSchema>;

 /**
 * @description OK or ApiError.
 */
export const monitoringHealth200Schema = z.coerce.string();
export type MonitoringHealth200Schema = z.infer<typeof monitoringHealth200Schema>;
/**
 * @description An unexpected error response.
 */
export const monitoringHealthErrorSchema = z.lazy(() => apiErrorSchema);
export type MonitoringHealthErrorSchema = z.infer<typeof monitoringHealthErrorSchema>;
/**
 * @description OK or ApiError.
 */
export const monitoringHealthQueryResponseSchema = z.coerce.string();
export type MonitoringHealthQueryResponseSchema = z.infer<typeof monitoringHealthQueryResponseSchema>;

 /**
 * @description Metrics as text.
 */
export const monitoringMetrics200Schema = z.coerce.string();
export type MonitoringMetrics200Schema = z.infer<typeof monitoringMetrics200Schema>;
/**
 * @description An unexpected error response.
 */
export const monitoringMetricsErrorSchema = z.lazy(() => apiErrorSchema);
export type MonitoringMetricsErrorSchema = z.infer<typeof monitoringMetricsErrorSchema>;
/**
 * @description Metrics as text.
 */
export const monitoringMetricsQueryResponseSchema = z.coerce.string();
export type MonitoringMetricsQueryResponseSchema = z.infer<typeof monitoringMetricsQueryResponseSchema>;

 /**
 * @description The OpenAPI JSON spec
 */
export const docsOpenapi200Schema = z.any();
export type DocsOpenapi200Schema = z.infer<typeof docsOpenapi200Schema>;
/**
 * @description An unexpected error response.
 */
export const docsOpenapiErrorSchema = z.lazy(() => apiErrorSchema);
export type DocsOpenapiErrorSchema = z.infer<typeof docsOpenapiErrorSchema>;

 export const docsOpenapiQueryResponseSchema = z.any();
export type DocsOpenapiQueryResponseSchema = z.infer<typeof docsOpenapiQueryResponseSchema>;

 /**
 * @description The Api version and commit hash.
 */
export const docsVersion200Schema = z.lazy(() => versionSchema);
export type DocsVersion200Schema = z.infer<typeof docsVersion200Schema>;
/**
 * @description An unexpected error response.
 */
export const docsVersionErrorSchema = z.lazy(() => apiErrorSchema);
export type DocsVersionErrorSchema = z.infer<typeof docsVersionErrorSchema>;
/**
 * @description The Api version and commit hash.
 */
export const docsVersionQueryResponseSchema = z.lazy(() => versionSchema);
export type DocsVersionQueryResponseSchema = z.infer<typeof docsVersionQueryResponseSchema>;

 export const operations = { "Usage_balance": {
        request: undefined,
        parameters: {
            path: undefined,
            query: usageBalanceQueryParamsSchema,
            header: undefined
        },
        responses: {
            200: usageBalanceQueryResponseSchema,
            default: usageBalanceQueryResponseSchema
        },
        errors: {}
    }, "Usage_balanceHistorical": {
        request: undefined,
        parameters: {
            path: undefined,
            query: usageBalanceHistoricalQueryParamsSchema,
            header: undefined
        },
        responses: {
            200: usageBalanceHistoricalQueryResponseSchema,
            default: usageBalanceHistoricalQueryResponseSchema
        },
        errors: {}
    }, "Monitoring_head": {
        request: undefined,
        parameters: {
            path: undefined,
            query: undefined,
            header: undefined
        },
        responses: {
            200: monitoringHeadQueryResponseSchema,
            default: monitoringHeadQueryResponseSchema
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
            200: monitoringHealthQueryResponseSchema,
            default: monitoringHealthQueryResponseSchema
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
            200: monitoringMetricsQueryResponseSchema,
            default: monitoringMetricsQueryResponseSchema
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
            200: docsOpenapiQueryResponseSchema,
            default: docsOpenapiQueryResponseSchema
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
            200: docsVersionQueryResponseSchema,
            default: docsVersionQueryResponseSchema
        },
        errors: {}
    } } as const;
export const paths = { "/account/balances": {
        get: operations["Usage_balance"]
    }, "/account/balances/historical": {
        get: operations["Usage_balanceHistorical"]
    }, "/head": {
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