import { NetworksRegistry } from '@pinax/graph-networks-registry';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import client from '../clickhouse/client.js';
import { config } from '../config.js';
import { extractVersion } from '../extractVersion.js';
import { logger } from '../logger.js';
import { withErrorResponses } from '../utils.js';

const registry = await NetworksRegistry.fromLatestVersion();

const route = new Hono();

const networksSchema = z.object({
    id: z.string(),
    fullName: z.string(),
    shortName: z.string(),
    caip2Id: z.string(),
    networkType: z.string(),
    icon: z.object({
        web3Icons: z.object({
            name: z.string(),
        }),
    }),
    aliases: z.array(z.string()),
});

const indexedToSchema = z.object({
    block_num: z.number(),
    datetime: z.string(),
    timestamp: z.number(),
});

const categoryIndexedToSchema = z.record(
    z.string(),
    z.object({
        version: z.string(),
        indexed_to: indexedToSchema,
    })
);

const responseSchema = z.object({
    networks: z.array(networksSchema),
    indexed_to: z.record(z.string(), categoryIndexedToSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Supported Networks',
        description:
            'Returns supported blockchain networks with identifiers, metadata, and indexed block information per database category.',
        tags: ['Monitoring'],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': {
                        schema: resolver(responseSchema),
                        examples: {
                            example: {
                                value: {
                                    networks: [getNetwork('mainnet')],
                                    indexed_to: {
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

export function getNetwork(id: string) {
    const network = registry.getNetworkByGraphId(id);
    if (!network) {
        logger.warn(`Network ${id} not found`);
        return {};
    }

    return {
        id,
        fullName: network.fullName,
        shortName: network.shortName,
        networkType: network.networkType,
        nativeToken: network.nativeToken,
        caip2Id: network.caip2Id,
        icon: network.icon,
        aliases: network.aliases,
    };
}

interface DbEntry {
    category: string;
    network: string;
    database: string;
    cluster: string;
}

interface IndexedToRow {
    category: string;
    network: string;
    version: string;
    block_num: number;
    datetime: string;
    timestamp: number;
}

interface CategoryEntry {
    version: string;
    indexed_to: {
        block_num: number;
        datetime: string;
        timestamp: number;
    };
}

type IndexedToResponse = Record<string, Record<string, CategoryEntry>>;

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
function buildIndexedToQuery(entries: DbEntry[]): string {
    const subqueries = entries.map(
        (e) =>
            `SELECT '${e.category}' as category, '${e.network}' as network, '${extractVersion(e.database)}' as version, max(b.block_num) as block_num, max(b.timestamp) as datetime, toUnixTimestamp(max(b.timestamp)) as timestamp FROM \`${e.database}\`.blocks as b`
    );
    return subqueries.join(' UNION ALL ');
}

/** Parse query rows into the indexed_to response structure */
function buildIndexedToResponse(rows: IndexedToRow[]): IndexedToResponse {
    const result: IndexedToResponse = {};
    for (const row of rows) {
        if (!result[row.category]) result[row.category] = {};
        result[row.category][row.network] = {
            version: row.version,
            indexed_to: {
                block_num: Number(row.block_num),
                datetime: row.datetime,
                timestamp: Number(row.timestamp),
            },
        };
    }
    return result;
}

/** Query indexed_to information for all database categories */
async function queryIndexedTo(): Promise<IndexedToResponse> {
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
                const query = buildIndexedToQuery(entries);
                const result = await client({ network: entries[0].network }).query({ query, format: 'JSONEachRow' });
                return result.json<IndexedToRow>();
            })
    );

    return buildIndexedToResponse(clusterResults.flat());
}

async function validateNetworks() {
    if (config.skipNetworksValidation) return;

    if (
        !config.networks.includes(config.defaultEvmNetwork) &&
        !config.networks.includes(config.defaultSvmNetwork) &&
        !config.networks.includes(config.defaultTvmNetwork)
    ) {
        throw new Error('Default network for EVM, SVM or TVM not found');
    }

    // Group networks by their cluster
    const networksByCluster = new Map<string, string[]>();
    for (const network of config.networks) {
        const networkDb =
            config.balancesDatabases[network] ||
            config.transfersDatabases[network] ||
            config.nftDatabases[network] ||
            config.dexDatabases[network] ||
            config.contractDatabases[network];

        if (!networkDb) {
            throw new Error(`No database configuration found for network: ${network}`);
        }

        const clusterName = networkDb.cluster;
        if (!networksByCluster.has(clusterName)) {
            networksByCluster.set(clusterName, []);
        }
        networksByCluster.get(clusterName)?.push(network);
    }

    // Validate each network against its cluster
    const query = 'SHOW DATABASES';
    for (const [clusterName, networks] of networksByCluster) {
        const result = await client({ network: networks[0] }).query({ query, format: 'JSONEachRow' });
        const dbs = await result.json<{ name: string }>();
        const dbs_networks = new Set(dbs.map((db) => db.name.split(':')[0]));

        for (const network of networks) {
            if (!dbs_networks.has(network)) {
                throw new Error(`Databases for ${network} not found in cluster ${clusterName}`);
            }
        }
    }
}

// store networks in memory
// this is a workaround to avoid loading networks from the database on every request
await validateNetworks();

logger.trace('Supported networks:\n', config.networks);
logger.trace(`Default EVM network: ${config.defaultEvmNetwork}`);
logger.trace(`Default SVM network: ${config.defaultSvmNetwork}`);
logger.trace(`Default TVM network: ${config.defaultTvmNetwork}`);

route.get('/networks', openapi, async (c) => {
    const indexed_to = await queryIndexedTo();

    return c.json({
        networks: config.networks
            .map((id) => getNetwork(id))
            .sort((a, b) => {
                return a.id && b.id ? a.id.localeCompare(b.id) : -1;
            }),
        indexed_to,
    });
});

export default route;
