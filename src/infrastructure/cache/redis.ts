/**
 * Redis service for caching operations
 */
import { redis } from 'bun';
import { withTimeout } from '../../utils.js';

const DEFAULT_TTL = 1 * 24 * 60 * 60; // 1 day
const TIMEOUT_MS = 1000;

/**
 * Initialize Redis with the provided URL
 * @param redisUrl Redis connection URL from CLI arguments
 */
export async function initRedis(redisUrl: string): Promise<void> {
    if (redisUrl) {
        process.env.REDIS_URL = redisUrl;

        // Test connection
        try {
            await withTimeout(redis.get('_connection_test'), TIMEOUT_MS, 'Redis connection test timed out');
            console.log('✅ Redis connection successful');
        } catch (error) {
            console.error(`⚠️ Redis connection failed: ${error}. Proceeding without cache.`);
            process.env.REDIS_URL = '';
        }
    } else {
        console.log('Redis URL not provided, caching will not be available');
    }
}

/**
 * Get a value from Redis cache
 * @param key The cache key
 * @returns The cached value or null if not found
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
    if (!process.env.REDIS_URL) return null;

    try {
        // using withTimeout because bun:redis hangs if redis is down, we want to avoid that
        const value = await withTimeout(redis.get(key), TIMEOUT_MS, 'Redis get timed out');
        if (!value) return null;

        return JSON.parse(value) as T;
    } catch (error) {
        console.error(`Error getting value from Redis for key ${key}:`, error);
        return null;
    }
}

/**
 * Set a value in Redis cache
 * @param key The cache key
 * @param value The value to cache
 * @param ttl TTL in seconds (optional, defaults to DEFAULT_TTL)
 * @returns true if successful, false otherwise
 */
export async function setInCache<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<boolean> {
    if (!process.env.REDIS_URL) return false;

    try {
        const valueStr = JSON.stringify(value);
        await withTimeout(redis.set(key, valueStr, 'EX', ttl), TIMEOUT_MS, 'Redis set with expiry timed out');
        return true;
    } catch (error) {
        console.error(`Error setting value in Redis for key ${key}:`, error);
        return false;
    }
}

/**
 * Generate cache key for spam score
 * @param contractAddress Contract address
 * @param networkId Network ID
 * @returns Cache key string
 */
export function getSpamScoreKey(contractAddress: string, networkId: string): string {
    return `spam:v0.3.0:${networkId}:${contractAddress}`;
}
