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

const CACHE_TTL_MS = 1000; // 1 second cache TTL
const MAX_CACHE_SIZE = 500;
const cache = new Map<string, CacheEntry>();
// In-flight deduplication: prevent thundering herd on cache miss
const inflight = new Map<string, Promise<IndexedTip | null>>();

function getCacheKey(network: string, database?: string): string {
    return `${network}:${database || 'default'}`;
}

/**
 * Evicts expired entries when cache exceeds MAX_CACHE_SIZE.
 */
function evictExpired(): void {
    if (cache.size <= MAX_CACHE_SIZE) return;
    const now = Date.now();
    for (const [key, entry] of cache) {
        if (entry.expiry <= now) cache.delete(key);
    }
}

async function fetchIndexedTip(network: string, database?: string): Promise<IndexedTip | null> {
    try {
        const clientConfig = { network, ...(database && { database }) };
        const query = 'SELECT max(block_num) as block_num, max(timestamp) as timestamp FROM blocks';
        const response = await client(clientConfig).query({
            query,
            format: 'JSONEachRow',
        });

        const rows = await response.json<{ block_num: number; timestamp: string }>();
        const row = rows[0];
        if (!row || !row.block_num) return null;

        const blockTimestamp = new Date(row.timestamp);
        return {
            block_num: Number(row.block_num),
            block_timestamp: blockTimestamp.toISOString(),
            block_timestamp_unix: Math.floor(blockTimestamp.getTime() / 1000),
        };
    } catch (err) {
        logger.warn(
            `Failed to fetch indexed tip for ${network}:${database || 'default'}: ${err instanceof Error ? err.message : err}`
        );
        return null;
    }
}

/**
 * Fetches the latest indexed block tip for a given network and database.
 * Uses an in-memory cache with a short TTL and deduplicates concurrent requests
 * to avoid thundering herd on cache expiry.
 *
 * @param network - Network ID (e.g. 'mainnet', 'solana-mainnet')
 * @param database - Optional database name (e.g. 'balances', 'transfers')
 * @returns The indexed tip or null if unavailable
 */
export async function getIndexedTip(network?: string, database?: string): Promise<IndexedTip | null> {
    if (!network) return null;

    const cacheKey = getCacheKey(network, database);
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > now) {
        return cached.tip;
    }

    // Deduplicate concurrent requests for the same key
    const existing = inflight.get(cacheKey);
    if (existing) return existing;

    const promise = fetchIndexedTip(network, database).then((tip) => {
        inflight.delete(cacheKey);
        if (tip) {
            evictExpired();
            cache.set(cacheKey, { tip, expiry: Date.now() + CACHE_TTL_MS });
        }
        return tip;
    });

    inflight.set(cacheKey, promise);
    return promise;
}
