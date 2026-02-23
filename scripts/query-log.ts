import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@clickhouse/client-web';
import { parse } from 'yaml';

// Usage: bun run query-log [--user <user>] [--password <pass>] [--hours <N>] [--limit <N>] [--sort memory|duration|read_bytes]

const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const userOverride = getArg('user', '');
const passwordOverride = getArg('password', '');
const hours = getArg('hours', '24');
const limit = getArg('limit', '30');
const sort = getArg('sort', 'memory');

const ORDER_BY: Record<string, string> = {
    memory: 'memory_usage DESC',
    duration: 'query_duration_ms DESC',
    read_bytes: 'read_bytes DESC',
};

// Groups similar queries and returns aggregated stats
const QUERY = `
SELECT
    count() AS query_count,
    substring(query, 1, 120) AS query_pattern,
    max(query_duration_ms) AS max_duration_ms,
    avg(query_duration_ms) AS avg_duration_ms,
    max(memory_usage) AS max_memory,
    formatReadableSize(max(memory_usage)) AS max_memory_readable,
    formatReadableSize(avg(memory_usage)) AS avg_memory_readable,
    sum(read_rows) AS total_read_rows,
    formatReadableSize(sum(read_bytes)) AS total_read_size,
    max(event_time) AS last_seen,
    any(databases) AS databases,
    any(tables) AS tables
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL ${hours} HOUR
  AND query NOT LIKE '%system.query_log%'
GROUP BY query_pattern
ORDER BY ${ORDER_BY[sort]?.replace('query_duration_ms', 'max(query_duration_ms)').replace('memory_usage', 'max(memory_usage)').replace('read_bytes', 'sum(read_bytes)') || 'max(memory_usage) DESC'}
LIMIT ${limit}
`;

interface ClusterConfig {
    url: string;
    username?: string;
    password?: string;
}

interface QueryRow {
    query_count: number;
    query_pattern: string;
    max_duration_ms: number;
    avg_duration_ms: number;
    max_memory: number;
    max_memory_readable: string;
    avg_memory_readable: string;
    total_read_rows: number;
    total_read_size: string;
    last_seen: string;
    databases: string[];
    tables: string[];
}

function loadClusters(): Record<string, ClusterConfig> {
    const configPath = process.env.DBS_CONFIG_PATH || resolve(import.meta.dirname, '../dbs-config.yaml');
    const raw = parse(readFileSync(configPath, 'utf-8'));
    return raw.clusters;
}

function col(text: string, width: number, align: 'left' | 'right' = 'right'): string {
    const s = String(text).slice(0, width);
    return align === 'right' ? s.padStart(width) : s.padEnd(width);
}

function separator(widths: number[]): string {
    return `+-${widths.map((w) => '-'.repeat(w)).join('-+-')}-+`;
}

function printTable(rows: QueryRow[]) {
    const W = { n: 5, dur: 10, avgDur: 10, mem: 12, avgMem: 12, read: 12, rows: 14, cnt: 5, query: 80 };
    const widths = [W.n, W.dur, W.avgDur, W.mem, W.avgMem, W.read, W.rows, W.cnt, W.query];
    const sep = separator(widths);

    console.log(sep);
    console.log(
        `| ${col('#', W.n)} | ${col('Max Dur', W.dur)} | ${col('Avg Dur', W.avgDur)} | ${col('Peak Mem', W.mem)} | ${col('Avg Mem', W.avgMem)} | ${col('Read', W.read)} | ${col('Read Rows', W.rows)} | ${col('Runs', W.cnt)} | ${col('Query', W.query, 'left')} |`,
    );
    console.log(sep);

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const preview = r.query_pattern.replace(/\s+/g, ' ').trim();
        console.log(
            `| ${col(String(i + 1), W.n)} | ${col(`${r.max_duration_ms}ms`, W.dur)} | ${col(`${Math.round(r.avg_duration_ms)}ms`, W.avgDur)} | ${col(r.max_memory_readable, W.mem)} | ${col(r.avg_memory_readable, W.avgMem)} | ${col(r.total_read_size, W.read)} | ${col(String(r.total_read_rows), W.rows)} | ${col(String(r.query_count), W.cnt)} | ${col(preview, W.query, 'left')} |`,
        );
    }

    console.log(sep);
}

async function scanCluster(name: string, cluster: ClusterConfig): Promise<void> {
    const client = createClient({
        url: cluster.url,
        username: userOverride || cluster.username,
        password: passwordOverride || cluster.password,
        request_timeout: 30_000,
    });

    try {
        const result = await client.query({ query: QUERY, format: 'JSONEachRow' });
        const rows = await result.json<QueryRow[]>();

        console.log(`\n  Cluster: ${name} (${cluster.url})`);
        console.log(`  Last ${hours}h | sorted by ${sort} | ${rows.length} unique query patterns\n`);

        if (rows.length === 0) {
            console.log('  (no queries found)');
        } else {
            printTable(rows);
        }
    } catch (err) {
        console.log(`\n  Cluster: ${name} (${cluster.url})`);
        console.error(`  Error: ${err instanceof Error ? err.message : err}`);
    } finally {
        await client.close();
    }
}

async function main() {
    const clusters = loadClusters();
    // Deduplicate clusters by URL
    const seen = new Set<string>();
    const unique: [string, ClusterConfig][] = [];
    for (const [name, cluster] of Object.entries(clusters)) {
        if (!seen.has(cluster.url)) {
            seen.add(cluster.url);
            unique.push([name, cluster]);
        }
    }

    console.log(`Scanning ${unique.length} cluster(s)...`);
    for (const [name, cluster] of unique) {
        await scanCluster(name, cluster);
    }
}

main().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
