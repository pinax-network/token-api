// From https://github.com/pinax-network/substreams-sink-websockets/blob/main/src/prometheus.ts
import client, { Counter, CounterConfiguration, Gauge, GaugeConfiguration, Histogram, HistogramConfiguration } from 'prom-client';
import { logger } from "./logger.js";
import { config } from './config.js';

export const registry = new client.Registry();

function prefixMetric(name: string): string {
    return `antelope_token_api_${name}`;
}

// Metrics
export function registerCounter(name: string, help = "help", labelNames: string[] = [], config?: Partial<CounterConfiguration<string>>) {
    try {
        name = prefixMetric(name);
        registry.registerMetric(new Counter({ name, help, labelNames, ...config }));
        logger.debug(`Registered new counter metric: ${name}`);
        return registry.getSingleMetric(name) as Counter;
    } catch (e) {
        logger.error("Error registering counter:", { name, e });
        throw new Error(`${e}`);
    }
}

export function registerGauge(name: string, help = "help", labelNames: string[] = [], config?: Partial<GaugeConfiguration<string>>) {
    try {
        name = prefixMetric(name);
        registry.registerMetric(new Gauge({ name, help, labelNames, ...config }));
        logger.debug(`Registered new gauge metric: ${name}`);
        return registry.getSingleMetric(name) as Gauge;
    } catch (e) {
        logger.error("Error registering gauge:", { name, e });
        throw new Error(`${e}`);
    }
}

export function registerHistogram(name: string, help = "help", labelNames: string[] = [], config?: Partial<HistogramConfiguration<string>>) {
    try {
        name = prefixMetric(name);
        registry.registerMetric(new Histogram({ name, help, labelNames, ...config }));
        logger.debug(`Registered new histogram metric: ${name}`);
        return registry.getSingleMetric(name) as Histogram;
    } catch (e) {
        logger.error("Error registering histogram:", { name, e });
        throw new Error(`${e}`);
    }
}

function createBucket(lowExponentBound: number, highExponentBound: number): number[] {
    if (lowExponentBound > highExponentBound)
        return createBucket(highExponentBound, lowExponentBound);

    // Returns 1*10^k, 2*10^k, ..., 9*10^k for successive powers of 10 between low and high bounds.
    return Array.from(
        { length: 9 * (highExponentBound - lowExponentBound) },
        (_, i) => Number(
            (
                (i % 9 + 1) * 10 ** (lowExponentBound + Math.floor(i / 9))
            ).toFixed(
                // Fixes floating point arithmetic imprecisions for negative exponents
                Math.max(Math.abs(lowExponentBound) - Math.floor(i / 9), 1)
            )
        )
    );
}

// REST API metrics
export const requests_errors = registerCounter('http_requests_errors_total', 'Total Requests errors by path and status', ['pathname', 'status']);
export const requests = registerCounter('http_requests_total', 'Total Requests by path', ['pathname']);
export const queries = registerCounter('ch_queries_total', 'Total ClickHouse DB queries made');
export const large_queries = registerCounter('ch_large_queries', 'Large ClickHouse DB queries (>10M rows or >1GB read)',
    ['query_id', 'bytes_read', 'rows_read', 'elapsed_seconds']
);
export const bytes_read = registerHistogram('ch_bytes_read', 'ClickHouse DB aggregated query statistics bytes read', [],
    {
        // Create buckets based on large queries trigger setting with a range of 10 values for 6 powers of 10.
        buckets: createBucket(Math.floor(Math.log10(config.maxBytesTrigger)) - 6, Math.floor(Math.log10(config.maxBytesTrigger)))
    }
);
export const rows_read = registerHistogram('ch_rows_read', 'ClickHouse DB aggregated query statistics rows read', [],
    {
        // Create buckets based on large queries trigger setting with a range of 10 values for 5 powers of 10.
        buckets: createBucket(Math.floor(Math.log10(config.maxRowsTrigger)) - 5, Math.floor(Math.log10(config.maxRowsTrigger)))
    }
);
export const elapsed_seconds = registerHistogram('ch_elapsed_seconds', 'ClickHouse DB aggregated query statistics query elapsed time (seconds)', [],
    { 
        buckets: createBucket(-4, 1) // 0.1ms to 10s, each divided by 10
    }
);
