import client from '../clickhouse/client.js';
import { logger } from '../logger.js';

export interface IndexedTip {
    block_num: number;
    block_timestamp: string;
    block_timestamp_unix: number;
}

interface CacheEntry {
    tip: IndexedTip;
    expiry: number;
}

const CACHE_TTL_MS = 5000; // 5 seconds cache TTL
const cache = new Map<string, CacheEntry>();

/**
 * Fetches the latest indexed block tip for a given network.
 * Uses an in-memory cache with a short TTL to avoid excessive DB queries.
 *
 * @param network - The network identifier (e.g., 'mainnet', 'solana')
 * @returns The indexed tip or null if unavailable
 */
export async function getIndexedTip(network?: string): Promise<IndexedTip | null> {
    if (!network) return null;

    const now = Date.now();
    const cached = cache.get(network);
    if (cached && cached.expiry > now) {
        return cached.tip;
    }

    try {
        const query = 'SELECT max(block_num) as block_num, max(timestamp) as timestamp FROM blocks';
        const response = await client({ network }).query({
            query,
            format: 'JSONEachRow',
        });

        const rows = await response.json<{ block_num: number; timestamp: string }>();
        if (!rows.length || !rows[0].block_num) return null;

        const row = rows[0];
        const blockTimestamp = new Date(row.timestamp);
        const tip: IndexedTip = {
            block_num: Number(row.block_num),
            block_timestamp: blockTimestamp.toISOString(),
            block_timestamp_unix: Math.floor(blockTimestamp.getTime() / 1000),
        };

        cache.set(network, { tip, expiry: now + CACHE_TTL_MS });
        return tip;
    } catch (err) {
        logger.warn(`Failed to fetch indexed tip for network ${network}: ${err instanceof Error ? err.message : err}`);
        return null;
    }
}
