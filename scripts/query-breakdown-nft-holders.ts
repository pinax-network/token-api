import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@clickhouse/client-web';
import { parse } from 'yaml';

const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? (args[idx + 1] as string) : fallback;
}

const contract = getArg('contract', '0xbd3531da5cf5857e7cfaa92426877b022e612cf8'); // Pudgy Penguins
const network = getArg('network', 'mainnet');

// Load config
const configPath = process.env.DBS_CONFIG_PATH || resolve(import.meta.dirname, '../dbs-config.yaml');
const raw = parse(readFileSync(configPath, 'utf-8'));
const networkConfig = raw.networks[network];
if (!networkConfig) {
    console.error(`Network not found: ${network}`);
    process.exit(1);
}
const cluster = raw.clusters[networkConfig.cluster];
const dbNft = networkConfig.nfts;

console.log(`Network: ${network}`);
console.log(`Contract: ${contract}`);
console.log(`Cluster: ${networkConfig.cluster} (${cluster.url})`);
console.log(`NFT DB: ${dbNft}`);
console.log('');

const client = createClient({
    url: cluster.url,
    username: cluster.username,
    password: cluster.password,
    request_timeout: 120_000,
    clickhouse_settings: { use_query_cache: 0 },
});

interface QueryStats {
    name: string;
    rows_read: number;
    bytes_read: number;
    elapsed_ms: number;
    result_rows: number;
}

function replaceParams(sql: string): string {
    return sql
        .replace(/\{db_nft:Identifier\}/g, `\`${dbNft}\``)
        .replace(/\{contract:String\}/g, `'${contract}'`)
        .replace(/\{network:String\}/g, `'${network}'`)
        .replace(/\{limit:UInt64\}/g, '100')
        .replace(/\{offset:UInt64\}/g, '0');
}

async function runQuery(name: string, sql: string): Promise<QueryStats> {
    const start = performance.now();
    try {
        const result = await client.query({ query: sql, format: 'JSONEachRow' });
        const data = await result.json<Record<string, unknown>[]>();
        const elapsed = performance.now() - start;
        const summary = result.response_headers['x-clickhouse-summary'];
        let rows_read = 0;
        let bytes_read = 0;
        if (summary) {
            const parsed = JSON.parse(Array.isArray(summary) ? summary[0] ?? '{}' : summary);
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

async function main() {
    const queryDir = resolve(import.meta.dirname, '../queries/nft-query-breakdown/holders_evm');
    const files = readdirSync(queryDir).filter(f => f.endsWith('.sql')).sort();

    const results: QueryStats[] = [];

    for (const file of files) {
        const sql = replaceParams(readFileSync(resolve(queryDir, file), 'utf-8'));
        const name = file.replace('.sql', '').replace(/^\d+_/, '');
        process.stdout.write(`Running: ${name}...`);
        const stats = await runQuery(name, sql);
        results.push(stats);
        console.log(` done (${stats.elapsed_ms}ms)`);
    }

    // Run the full query from src
    const fullSql = replaceParams(readFileSync(resolve(import.meta.dirname, '../src/routes/nft/holders_evm.sql'), 'utf-8'));
    process.stdout.write('Running: FULL QUERY...');
    const fullStats = await runQuery('FULL QUERY', fullSql);
    results.push(fullStats);
    console.log(` done (${fullStats.elapsed_ms}ms)`);

    console.log(`\n${'='.repeat(110)}`);
    console.log('QUERY BREAKDOWN: holders_evm.sql');
    console.log('='.repeat(110));

    const nameW = 35;
    console.log(['CTE Name'.padEnd(nameW), 'Rows Read'.padStart(14), 'Bytes Read'.padStart(14), 'Elapsed'.padStart(10), 'Result Rows'.padStart(12)].join(' | '));
    console.log('-'.repeat(110));

    for (const r of results) {
        console.log([(r.name === 'FULL QUERY' ? `** ${r.name} **` : r.name).padEnd(nameW), formatRows(r.rows_read).padStart(14), formatBytes(r.bytes_read).padStart(14), `${r.elapsed_ms}ms`.padStart(10), String(r.result_rows).padStart(12)].join(' | '));
    }

    console.log('-'.repeat(110));
    const individual = results.filter(r => r.name !== 'FULL QUERY');
    const totalRows = individual.reduce((a, b) => a + b.rows_read, 0);
    const totalBytes = individual.reduce((a, b) => a + b.bytes_read, 0);
    const totalElapsed = individual.reduce((a, b) => a + b.elapsed_ms, 0);
    console.log(['SUM (individual CTEs)'.padEnd(nameW), formatRows(totalRows).padStart(14), formatBytes(totalBytes).padStart(14), `${totalElapsed}ms`.padStart(10), ''.padStart(12)].join(' | '));
    console.log('='.repeat(110));

    const sorted = [...individual].sort((a, b) => b.rows_read - a.rows_read);
    console.log('\nTop contributors by rows read:');
    for (const r of sorted.slice(0, 3)) {
        const pct = totalRows > 0 ? ((r.rows_read / totalRows) * 100).toFixed(1) : '0';
        console.log(`  ${r.name}: ${formatRows(r.rows_read)} rows (${pct}%) | ${formatBytes(r.bytes_read)} | ${r.elapsed_ms}ms`);
    }

    await client.close();
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
