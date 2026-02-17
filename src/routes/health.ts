import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import client from '../clickhouse/client.js';
import { config } from '../config.js';
import { withErrorResponses } from '../utils.js';

interface HealthRow {
    category: string;
    network: string;
    version: string;
    block_num: number;
    datetime: string;
    timestamp: number;
}

interface CategoryHealth {
    version: string;
    indexed_to: {
        block_num: number;
        datetime: string;
        timestamp: number;
    };
}

type HealthResponse = Record<string, Record<string, CategoryHealth>>;

/** Extract version from database name (e.g. "mainnet:evm-transfers@v0.2.2" → "0.2.2") */
export function extractVersion(database: string): string {
    const match = database.match(/@v(.+)$/);
    return match?.[1] ?? 'unknown';
}

interface DbEntry {
    category: string;
    network: string;
    database: string;
    cluster: string;
}

/** Collect all DB entries with category labels */
function collectDbEntries(): DbEntry[] {
    const entries: DbEntry[] = [];
    const categories: [string, Record<string, { database: string; cluster: string }>][] = [
        ['transfers', config.transfersDatabases],
        ['balances', config.balancesDatabases],
        ['dexes', config.dexDatabases],
    ];
    for (const [category, databases] of categories) {
        for (const [network, mapping] of Object.entries(databases)) {
            entries.push({ category, network, database: mapping.database, cluster: mapping.cluster });
        }
    }
    return entries;
}

/** Build a single SQL query using UNION ALL subqueries for all databases on a cluster */
function buildHealthQuery(entries: DbEntry[]): string {
    const subqueries = entries.map(
        (e) =>
            `SELECT '${e.category}' as category, '${e.network}' as network, '${extractVersion(e.database)}' as version, max(block_num) as block_num, max(timestamp) as datetime, toUnixTimestamp(max(timestamp)) as timestamp FROM \`${e.database}\`.blocks`
    );
    return subqueries.join(' UNION ALL ');
}

/** Parse query rows into the health response structure */
function buildHealthResponse(rows: HealthRow[]): HealthResponse {
    const health: HealthResponse = {};
    for (const row of rows) {
        if (!health[row.category]) health[row.category] = {};
        health[row.category][row.network] = {
            version: row.version,
            indexed_to: {
                block_num: Number(row.block_num),
                datetime: row.datetime,
                timestamp: Number(row.timestamp),
            },
        };
    }
    return health;
}

const indexedToSchema = z.object({
    block_num: z.number(),
    datetime: z.string(),
    timestamp: z.number(),
});

const categoryHealthSchema = z.object({
    version: z.string(),
    indexed_to: indexedToSchema,
});

const healthResponseSchema = z.record(z.string(), z.record(z.string(), categoryHealthSchema));

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Health Check',
        description:
            'Returns indexed block information for all connected databases per category (transfers, balances, dexes).',
        tags: ['Monitoring'],
        responses: {
            200: {
                description: 'Indexed block information per database category',
                content: {
                    'application/json': {
                        schema: resolver(healthResponseSchema),
                        examples: {
                            example: {
                                summary: 'Health response',
                                value: {
                                    transfers: {
                                        mainnet: {
                                            version: '0.2.2',
                                            indexed_to: {
                                                block_num: 24278225,
                                                datetime: '2026-01-20 19:57:11',
                                                timestamp: 1768939031,
                                            },
                                        },
                                    },
                                    balances: {
                                        mainnet: {
                                            version: '0.2.3',
                                            indexed_to: {
                                                block_num: 24278200,
                                                datetime: '2026-01-20 19:56:47',
                                                timestamp: 1768939007,
                                            },
                                        },
                                    },
                                    dexes: {
                                        mainnet: {
                                            version: '0.2.6',
                                            indexed_to: {
                                                block_num: 24278100,
                                                datetime: '2026-01-20 19:54:47',
                                                timestamp: 1768938887,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    })
);

const route = new Hono();

route.get('/health', openapi, async (c) => {
    const allEntries = collectDbEntries();

    // Group entries by cluster to send one query per cluster
    const byCluster = new Map<string, DbEntry[]>();
    for (const entry of allEntries) {
        const group = byCluster.get(entry.cluster) ?? [];
        group.push(entry);
        byCluster.set(entry.cluster, group);
    }

    // Execute one query per cluster in parallel
    const clusterResults = await Promise.all(
        [...byCluster.entries()]
            .filter(([, entries]) => entries.length > 0)
            .map(async ([, entries]) => {
                const query = buildHealthQuery(entries);
                // Use the first network in the cluster group for client routing
                const result = await client({ network: entries[0].network }).query({ query, format: 'JSONEachRow' });
                return result.json<HealthRow>();
            })
    );

    const allRows = clusterResults.flat();
    return c.json(buildHealthResponse(allRows));
});

export default route;
