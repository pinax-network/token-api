import * as crypto from 'node:crypto'
import client from "./client.js";

import { logger } from "../logger.js";
import * as prometheus from "../prometheus.js";

import type { ResponseJSON } from "@clickhouse/client-web";
import type { ValidQueryParams } from "../types/api.js";
import { config } from "../config.js";

export async function makeQuery<T = unknown>(query: string, query_params?: ValidQueryParams) {
    const query_id = crypto.randomUUID();
    logger.trace({ query_id, query, query_params });

    const response = await client.query({ query, query_params, format: "JSON", query_id });
    const data: ResponseJSON<T> = await response.json();
    prometheus.queries.inc();

    if (response.query_id !== query_id) throw new Error(`Wrong query ID for query: sent ${query_id} / received ${response.query_id}`);

    if (data.statistics) {
        prometheus.bytes_read.observe(data.statistics.bytes_read);
        prometheus.rows_read.observe(data.statistics.rows_read);
        prometheus.elapsed_seconds.observe(data.statistics.elapsed);

        if (data.statistics.rows_read > config.maxRowsTrigger || data.statistics.bytes_read > config.maxBytesTrigger)
            prometheus.large_queries.inc({
                query_id,
                bytes_read: data.statistics.bytes_read,
                rows_read: data.statistics.rows_read,
                elapsed_seconds: data.statistics.elapsed
            });
    }

    logger.trace({ query_id: response.query_id, statistics: data.statistics, rows: data.rows, rows_before_limit_at_least: data.rows_before_limit_at_least });
    
    return data;
}