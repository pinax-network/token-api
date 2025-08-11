import { redis } from 'bun';

const DEFAULT_TTL = 1 * 24 * 60 * 60; // 1 day

/**
 * Initialize Redis with the provided URL
 * @param redisUrl Redis connection URL from CLI arguments
 */
export function initRedis(redisUrl: string): void {
    if (redisUrl) {
        process.env.REDIS_URL = redisUrl;

        // Test connection
        redis
            .get('_connection_test')
            .then(() => {
                console.log('✅ Redis connection successful');
            })
            .catch((error) => {
                console.error(`❌ Redis connection failed: ${error.message}`);
                process.env.REDIS_URL = '';
            });
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
        const value = await redis.get(key);
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
        await redis.set(key, valueStr);
        await redis.expire(key, ttl);
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
    return `spam:${networkId}:${contractAddress.toLowerCase()}`;
}
