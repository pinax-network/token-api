import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@clickhouse/client-web';
import { parse } from 'yaml';

// Usage: bun run scripts/query-breakdown-svm-dex.ts [--network <net>] [--block <num>] [--mint <addr>]
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? (args[idx + 1] as string) : fallback;
}

const network = getArg('network', 'solana');
const block = getArg('block', '402091904');
const mint = getArg('mint', 'So11111111111111111111111111111111111111112'); // SOL

// Load config
const configPath = process.env.DBS_CONFIG_PATH || resolve(import.meta.dirname, '../dbs-config.yaml');
const raw = parse(readFileSync(configPath, 'utf-8'));
const networkConfig = raw.networks[network];
if (!networkConfig) {
    console.error(`Network not found: ${network}`);
    process.exit(1);
}
const cluster = raw.clusters[networkConfig.cluster];
const dbDex = networkConfig.dexes;

console.log(`Network: ${network}`);
console.log(`Cluster: ${networkConfig.cluster} (${cluster.url})`);
console.log(`DEX DB: ${dbDex}`);
console.log(`Test block_num: ${block}`);
console.log(`Test mint: ${mint}`);
console.log('');

const client = createClient({
    url: cluster.url,
    username: cluster.username,
    password: cluster.password,
    request_timeout: 120_000,
    clickhouse_settings: {
        use_query_cache: 0,
    },
});

interface QueryStats {
    name: string;
    rows_read: number;
    bytes_read: number;
    elapsed_ms: number;
    result_rows: number;
}

async function runQuery(name: string, sql: string): Promise<QueryStats> {
    const start = performance.now();
    try {
        const result = await client.query({ query: sql, format: 'JSONEachRow' });
        const data = await result.json<Record<string, unknown>[]>();
        const elapsed = performance.now() - start;
        const stats = result.response_headers;

        const summary = stats['x-clickhouse-summary'];
        let rows_read = 0;
        let bytes_read = 0;
        if (summary) {
            const rawSummary = Array.isArray(summary) ? summary[0] : summary;
            const parsed = JSON.parse(rawSummary ?? '{}');
            rows_read = Number(parsed.read_rows || 0);
            bytes_read = Number(parsed.read_bytes || 0);
        }

        return { name, rows_read, bytes_read, elapsed_ms: Math.round(elapsed), result_rows: data.length };
    } catch (err) {
        console.error(`  ERROR running ${name}:`, err instanceof Error ? err.message : err);
        return { name, rows_read: 0, bytes_read: 0, elapsed_ms: 0, result_rows: 0 };
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KiB', 'MiB', 'GiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

function formatRows(rows: number): string {
    if (rows >= 1_000_000) return `${(rows / 1_000_000).toFixed(2)}M`;
    if (rows >= 1_000) return `${(rows / 1_000).toFixed(2)}K`;
    return String(rows);
}

// ─── Query patterns to benchmark ───
const queries: { name: string; sql: string }[] = [
    // blocks table lookups
    {
        name: 'blocks: by block_num',
        sql: `SELECT timestamp FROM \`${dbDex}\`.blocks WHERE block_num = ${block}`,
    },
    {
        name: 'blocks: max block_num',
        sql: `SELECT max(block_num) AS latest FROM \`${dbDex}\`.blocks`,
    },

    // swaps: timestamp filters (primary index prefix)
    {
        name: 'swaps: WITH timestamp (last 10 min)',
        sql: `
            SELECT * FROM \`${dbDex}\`.swaps
            WHERE timestamp >= now() - INTERVAL 10 MINUTE
            ORDER BY timestamp DESC
            LIMIT 10
        `,
    },
    {
        name: 'swaps: WITH timestamp range',
        sql: `
            SELECT * FROM \`${dbDex}\`.swaps
            WHERE timestamp BETWEEN now() - INTERVAL 1 HOUR AND now() - INTERVAL 50 MINUTE
            ORDER BY timestamp DESC
            LIMIT 10
        `,
    },

    // swaps: timestamp + block_num (optimal)
    {
        name: 'swaps: WITH timestamp + block_num',
        sql: `
            SELECT * FROM \`${dbDex}\`.swaps
            WHERE timestamp >= now() - INTERVAL 10 MINUTE
              AND block_num >= ${block}
            ORDER BY timestamp DESC
            LIMIT 10
        `,
    },

    // swaps: block_num only (FULL SCAN — the problematic case)
    {
        name: 'swaps: WITH block_num ONLY (⚠️ full scan)',
        sql: `
            SELECT * FROM \`${dbDex}\`.swaps
            WHERE block_num < ${block}
            ORDER BY block_num DESC
            LIMIT 10
        `,
    },

    // swaps: no filters (FULL SCAN)
    {
        name: 'swaps: NO filters (⚠️ full scan)',
        sql: `
            SELECT * FROM \`${dbDex}\`.swaps
            ORDER BY timestamp DESC
            LIMIT 10
        `,
    },

    // swaps: block_num resolved via blocks table (THE FIX)
    {
        name: 'swaps: block→timestamp resolved (✅ fix)',
        sql: `
            WITH block_ts AS (
                SELECT max(timestamp) AS ts FROM \`${dbDex}\`.blocks WHERE block_num = ${block}
            )
            SELECT * FROM \`${dbDex}\`.swaps
            WHERE timestamp <= (SELECT ts FROM block_ts)
              AND block_num <= ${block}
            ORDER BY timestamp DESC
            LIMIT 10
        `,
    },

    // swaps: with mint filter (uses materialized view)
    {
        name: 'swaps: WITH input_mint filter',
        sql: `
            SELECT * FROM \`${dbDex}\`.swaps
            WHERE input_mint = '${mint}'
              AND timestamp >= now() - INTERVAL 10 MINUTE
            ORDER BY timestamp DESC
            LIMIT 10
        `,
    },
];

async function main() {
    const results: QueryStats[] = [];

    for (const q of queries) {
        process.stdout.write(`Running: ${q.name}...`);
        const stats = await runQuery(q.name, q.sql);
        results.push(stats);
        console.log(` done (${stats.elapsed_ms}ms)`);
    }

    console.log(`\n${'='.repeat(110)}`);
    console.log('SVM DEX SWAPS — QUERY BREAKDOWN');
    console.log('='.repeat(110));

    const nameW = 45;
    const header = [
        'Query Pattern'.padEnd(nameW),
        'Rows Read'.padStart(14),
        'Bytes Read'.padStart(14),
        'Elapsed'.padStart(10),
        'Result Rows'.padStart(12),
    ].join(' | ');
    console.log(header);
    console.log('-'.repeat(110));

    for (const r of results) {
        const row = [
            r.name.padEnd(nameW),
            formatRows(r.rows_read).padStart(14),
            formatBytes(r.bytes_read).padStart(14),
            `${r.elapsed_ms}ms`.padStart(10),
            String(r.result_rows).padStart(12),
        ].join(' | ');
        console.log(row);
    }

    console.log('='.repeat(110));

    // Highlight the comparison
    const blockOnly = results.find((r) => r.name.includes('block_num ONLY'));
    const blockFixed = results.find((r) => r.name.includes('fix'));
    if (blockOnly && blockFixed && blockOnly.rows_read > 0) {
        const reduction = ((1 - blockFixed.rows_read / blockOnly.rows_read) * 100).toFixed(1);
        console.log(`\n📊 Fix impact: ${reduction}% fewer rows read (${formatRows(blockOnly.rows_read)} → ${formatRows(blockFixed.rows_read)})`);
    }

    await client.close();
}

main().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
