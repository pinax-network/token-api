import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import client from '../clickhouse/client.js';
import type { NetworkDatabaseMapping } from '../config/dbsConfig.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { withErrorResponses } from '../utils.js';

interface BlocksTip {
    block_num: number;
    datetime: string;
    timestamp: number;
}

interface CategoryHealth {
    version: string;
    indexed_to: BlocksTip;
}

type HealthResponse = Record<string, Record<string, CategoryHealth>>;

/** Extract version from database name (e.g. "mainnet:evm-transfers@v0.2.2" → "0.2.2") */
export function extractVersion(database: string): string {
    const match = database.match(/@v(.+)$/);
    return match?.[1] ?? 'unknown';
}

/** Query the blocks table for max block_num and timestamp */
async function queryBlocksTip(database: string, network: string): Promise<BlocksTip> {
    const query = `SELECT max(block_num) as block_num, max(timestamp) as timestamp FROM \`${database}\`.blocks`;

    const result = await client({ network }).query({
        query,
        format: 'JSONEachRow',
    });

    const rows = await result.json<{ block_num: number; timestamp: string }>();
    const row = rows[0];

    if (!row || !row.block_num) {
        return { block_num: 0, datetime: '', timestamp: 0 };
    }

    const date = new Date(row.timestamp);
    return {
        block_num: Number(row.block_num),
        datetime: row.timestamp.replace('T', ' ').substring(0, 19),
        timestamp: Math.floor(date.getTime() / 1000),
    };
}

/** Query indexed_to for all networks in a database category */
async function queryCategoryHealth(
    databases: Record<string, NetworkDatabaseMapping>
): Promise<Record<string, CategoryHealth>> {
    const entries = Object.entries(databases);
    if (entries.length === 0) return {};

    const results = await Promise.allSettled(
        entries.map(async ([network, mapping]) => {
            const tip = await queryBlocksTip(mapping.database, network);
            return {
                network,
                version: extractVersion(mapping.database),
                indexed_to: tip,
            };
        })
    );

    const health: Record<string, CategoryHealth> = {};
    for (const result of results) {
        if (result.status === 'fulfilled') {
            health[result.value.network] = {
                version: result.value.version,
                indexed_to: result.value.indexed_to,
            };
        } else {
            logger.error({ error: result.reason }, 'Health check query failed');
        }
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
    const [transfers, balances, dexes] = await Promise.all([
        queryCategoryHealth(config.transfersDatabases),
        queryCategoryHealth(config.balancesDatabases),
        queryCategoryHealth(config.dexDatabases),
    ]);

    const health: HealthResponse = {};
    if (Object.keys(transfers).length > 0) health.transfers = transfers;
    if (Object.keys(balances).length > 0) health.balances = balances;
    if (Object.keys(dexes).length > 0) health.dexes = dexes;

    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    return c.json(health);
});

export default route;
