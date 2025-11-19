import * as crypto from 'node:crypto';
import { isProgressRow, type ProgressRow } from '@clickhouse/client';
import type { ResponseJSON } from '@clickhouse/client-web';
import type { WebClickHouseClientConfigOptions } from '@clickhouse/client-web/dist/config.js';
import { ZodError } from 'zod';
import type { ApiErrorResponse, ApiUsageResponse, ClientErrorResponse, ServerErrorResponse } from '../types/zod.js';
import client from './clickhouse.js';
import { config, DEFAULT_LIMIT, DEFAULT_PAGE } from './config.js';
import { logger } from './logger.js';

export async function makeQuery<T = unknown>(
    query: string,
    query_params: Record<string, unknown> = {},
    overwrite_config?: WebClickHouseClientConfigOptions
) {
    const query_id = crypto.randomUUID();
    // logger.trace({ query_id, overwrite_config, query, query_params });

    const response = await client(overwrite_config).query({
        query,
        query_params,
        format: 'JSONEachRowWithProgress',
        query_id,
    });

    const stream = response.stream();
    const data: T[] = [];
    let statistics = {
        bytes_read: 0,
        rows_read: 0,
        elapsed: 0,
    };

    // Stream rows for tracking query progress
    for await (const rows of stream) {
        for (const row of rows) {
            try {
                const decodedRow = row.json() as
                    | ProgressRow
                    | {
                          row?: T;
                          rows_before_limit_at_least?: number;
                          meta?: Array<Record<string, unknown>>;
                          exception?: string;
                      };

                if ('exception' in decodedRow && decodedRow.exception) {
                    throw new Error(`Exception executing query ${query_id}: ${decodedRow.exception}`);
                }
                if (isProgressRow(decodedRow)) {
                    statistics = {
                        bytes_read: Number(decodedRow.progress.read_bytes),
                        rows_read: Number(decodedRow.progress.read_rows),
                        elapsed: Number(decodedRow.progress.elapsed_ns) / 10 ** 9,
                    };
                } else if (decodedRow.row) {
                    data.push(decodedRow.row);
                }
            } catch (err) {
                logger.error({ query_id, error: err });
                throw new Error(`Error streaming query response: ${query_id}`);
            }
        }
    }

    // Log large queries
    if (
        statistics.rows_read > config.maxRowsTrigger ||
        statistics.bytes_read > config.maxBytesTrigger ||
        statistics.elapsed > config.maxQueryExecutionTime
    ) {
        logger.warn(
            {
                rows: statistics.rows_read,
                bytes: statistics.bytes_read,
                elapsed: statistics.elapsed,
                query,
                query_params,
            },
            'Large query detected'
        );
    }

    const responseJson: ResponseJSON<T> = { data, statistics, rows: data.length };

    if (response.query_id !== query_id)
        throw new Error(`Wrong query ID for query: sent ${query_id} / received ${response.query_id}`);

    // logger.trace({
    //     query_id: response.query_id,
    //     statistics: responseJson.statistics,
    //     rows: responseJson.rows,
    // });
    return responseJson;
}

export interface QueryOptions {
    limit?: number;
    page?: number;
    useQueryCache?: boolean;
    database?: string;
}

export async function executeUsageQuery<T = unknown>(
    query: string[],
    params: Record<string, unknown>,
    options: QueryOptions = {}
): Promise<ApiUsageResponse | ApiErrorResponse> {
    const request_time = new Date();
    const limit = options.limit ?? DEFAULT_LIMIT;
    const page = options.page ?? DEFAULT_PAGE;
    const useQueryCache = options.useQueryCache ?? true;

    const overwrite_config: WebClickHouseClientConfigOptions = {};
    if (options.database) {
        overwrite_config.database = options.database;
    }

    if (!useQueryCache) {
        overwrite_config.clickhouse_settings = {
            ...overwrite_config.clickhouse_settings,
            use_query_cache: 0,
        };
    }

    // inject request query params
    const queryParams = {
        ...params,
        // Since `page` starts at 1, `offset` should be positive for page > 1
        offset: limit * (page - 1),
        limit,
    };

    try {
        const result = await makeQuery<T>(query.join(' '), queryParams, overwrite_config);

        // Sometimes the timings will not make ClickHouse return a timeout error even though the data is empty
        if (
            result.data.length === 0 &&
            result.statistics &&
            result.statistics?.elapsed >= config.maxQueryExecutionTime
        ) {
            return {
                status: 504,
                code: 'database_timeout',
                message: 'Query took too long. Consider applying more filter parameters if possible.',
            };
        }

        return {
            data: result.data,
            statistics: result.statistics ?? {},
            pagination: {
                previous_page: page <= 1 ? page : page - 1,
                current_page: page,
            },
            results: result.rows ?? 0,
            request_time: request_time.toISOString(),
            duration_ms: Date.now() - Number(request_time),
        };
    } catch (err) {
        let message: string;

        if (err instanceof ZodError)
            return {
                status: 400 as ClientErrorResponse['status'],
                code: 'bad_query_input' as ClientErrorResponse['code'],
                message: err.issues[0]?.message ?? 'An unknown error occurred',
            };
        if (err instanceof Error) message = err.message;
        else if (typeof err === 'string') message = err;
        else message = 'An unknown error occurred';

        return {
            status: 500 as ServerErrorResponse['status'],
            code: 'bad_database_response' as ServerErrorResponse['code'],
            message,
        };
    }
}
