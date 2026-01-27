import * as crypto from 'node:crypto';
import { isProgressRow, type ProgressRow } from '@clickhouse/client';
import type { ResponseJSON } from '@clickhouse/client-web';
import type { WebClickHouseClientConfigOptions } from '@clickhouse/client-web/dist/config.js';
import { logger } from '../logger.js';
import client from './client.js';

export async function makeQuery<T = unknown>(
    query: string,
    query_params?: Record<string, unknown>,
    overwrite_config?: WebClickHouseClientConfigOptions
) {
    const query_id = crypto.randomUUID();
    logger.trace({ query_id, overwrite_config, query, query_params });

    // Extract network from query_params for cluster routing
    const network = typeof query_params?.network === 'string' ? query_params.network : undefined;
    const clientConfig = network ? { ...overwrite_config, network } : overwrite_config;

    const response = await client(clientConfig).query({
        query,
        query_params,
        format: 'JSONEachRowWithProgress',
        query_id,
    });
    const stream = response.stream<T>();
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

    const responseJson: ResponseJSON<T> = { data, statistics, rows: data.length };

    if (response.query_id !== query_id)
        throw new Error(`Wrong query ID for query: sent ${query_id} / received ${response.query_id}`);

    logger.trace({
        query_id: response.query_id,
        statistics: responseJson.statistics,
        rows: responseJson.rows,
    });
    return responseJson;
}
