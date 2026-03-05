import type { Context, Next } from 'hono';
import { config } from '../config.js';
import { makeQuery } from '../clickhouse/makeQuery.js';
import { logger } from '../logger.js';

/**
 * LRU-ish in-memory cache for block_num → timestamp resolution.
 * Block→timestamp mappings are immutable (finalized blocks never change),
 * so cached entries never need invalidation — only eviction for memory bounds.
 */
const CACHE_MAX_SIZE = 10_000;
const blockTimestampCache = new Map<string, number>(); // "network:block_num" → unix timestamp

function cacheKey(network: string, blockNum: number): string {
    return `${network}:${blockNum}`;
}

function cacheGet(network: string, blockNum: number): number | undefined {
    return blockTimestampCache.get(cacheKey(network, blockNum));
}

function cacheSet(network: string, blockNum: number, timestamp: number): void {
    const key = cacheKey(network, blockNum);
    // Simple eviction: delete oldest entries when at capacity
    if (blockTimestampCache.size >= CACHE_MAX_SIZE) {
        const firstKey = blockTimestampCache.keys().next().value;
        if (firstKey) blockTimestampCache.delete(firstKey);
    }
    blockTimestampCache.set(key, timestamp);
}

/**
 * Resolve a block number to a unix timestamp by querying the blocks table.
 * Uses >= for start blocks (find first block at or after) and <= for end blocks.
 * Returns null if the block is not found.
 */
async function resolveBlockToTimestamp(
    network: string,
    blockNum: number,
    direction: 'start' | 'end'
): Promise<number | null> {
    // Check cache first
    const cached = cacheGet(network, blockNum);
    if (cached !== undefined) {
        logger.trace({ msg: 'block→timestamp cache hit', network, blockNum, timestamp: cached });
        return cached;
    }

    // Determine which database has the blocks table for this network
    const dbMapping = config.transfersDatabases[network] || config.dexDatabases[network];

    if (!dbMapping) {
        logger.warn({ msg: 'No database found for block resolution', network });
        return null;
    }

    const db = dbMapping.database;
    const order = direction === 'start' ? 'ASC' : 'DESC';
    const comparator = direction === 'start' ? '>=' : '<=';

    // Use parameterized identifier for the database name
    const query = `SELECT toUnixTimestamp(timestamp) AS ts FROM ${db}.blocks WHERE block_num ${comparator} {block_num:UInt64} ORDER BY block_num ${order} LIMIT 1`;

    try {
        const result = await makeQuery<{ ts: number }>(query, { block_num: blockNum, network });

        if (result.data.length === 0) {
            logger.warn({ msg: 'Block not found in blocks table', network, blockNum });
            return null;
        }

        const timestamp = result.data[0]!.ts;
        cacheSet(network, blockNum, timestamp);

        logger.trace({ msg: 'block→timestamp resolved', network, blockNum, timestamp });
        return timestamp;
    } catch (err) {
        logger.error({ msg: 'Failed to resolve block→timestamp', network, blockNum, error: err });
        return null;
    }
}

/**
 * Hono middleware that resolves `start_block`/`end_block` query parameters
 * into timestamps and stores them as context variables for downstream use.
 *
 * This decouples block→timestamp resolution from SQL queries, allowing:
 * - In-memory caching of immutable block→timestamp mappings
 * - Simpler SQL without CTE block lookups (in follow-up)
 * - Consistent handling across all routes
 *
 * Resolved timestamps are stored in context variables:
 * - `resolvedStartTime`: unix timestamp from start_block resolution
 * - `resolvedEndTime`: unix timestamp from end_block resolution
 *
 * Behaviour:
 * - If `start_block` is provided and `start_time` is not, resolves and sets `resolvedStartTime`
 * - If `end_block` is provided and `end_time` is not, resolves and sets `resolvedEndTime`
 * - If both block and time params are provided, resolves block and picks the tighter bound
 * - No-op when no block params are provided
 */
export function blockResolver() {
    return async (ctx: Context, next: Next) => {
        const network = ctx.req.query('network');
        const startBlock = ctx.req.query('start_block');
        const endBlock = ctx.req.query('end_block');
        const startTime = ctx.req.query('start_time');
        const endTime = ctx.req.query('end_time');

        // No-op if no block params or no network
        if ((!startBlock && !endBlock) || !network) {
            return next();
        }

        if (startBlock) {
            const blockNum = parseInt(startBlock, 10);
            if (!isNaN(blockNum)) {
                const resolvedTs = await resolveBlockToTimestamp(network, blockNum, 'start');
                if (resolvedTs !== null) {
                    // If start_time is also provided, use the later (tighter) bound
                    const existingTs = startTime ? parseInt(startTime, 10) : 0;
                    const finalTs = Math.max(resolvedTs, existingTs);
                    ctx.set('resolvedStartTime', finalTs);
                }
            }
        }

        if (endBlock) {
            const blockNum = parseInt(endBlock, 10);
            if (!isNaN(blockNum)) {
                const resolvedTs = await resolveBlockToTimestamp(network, blockNum, 'end');
                if (resolvedTs !== null) {
                    // If end_time is also provided, use the earlier (tighter) bound
                    const existingTs = endTime ? parseInt(endTime, 10) : Infinity;
                    const finalTs = Math.min(resolvedTs, existingTs);
                    ctx.set('resolvedEndTime', finalTs);
                }
            }
        }

        return next();
    };
}

/**
 * Get resolved time bounds from context (set by blockResolver middleware).
 * Falls back to the original query params if no resolution was done.
 */
export function getResolvedTimeBounds(ctx: Context): {
    startTime: number | null;
    endTime: number | null;
} {
    const resolvedStart = ctx.get('resolvedStartTime') as number | undefined;
    const resolvedEnd = ctx.get('resolvedEndTime') as number | undefined;
    const queryStartTime = ctx.req.query('start_time');
    const queryEndTime = ctx.req.query('end_time');

    return {
        startTime: resolvedStart ?? (queryStartTime ? parseInt(queryStartTime, 10) : null),
        endTime: resolvedEnd ?? (queryEndTime ? parseInt(queryEndTime, 10) : null),
    };
}

/**
 * Get cache stats for monitoring/debugging.
 */
export function getBlockCacheStats() {
    return {
        size: blockTimestampCache.size,
        maxSize: CACHE_MAX_SIZE,
    };
}
