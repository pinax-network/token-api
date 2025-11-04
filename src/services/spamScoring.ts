/**
 * Service for retrieving spam scores for contracts
 */

import { config } from '../config.js';
import { withTimeout } from '../utils.js';
import { getFromCache, getSpamScoreKey, setInCache } from './redis.js';

/**
 * Interface for spam score response from the external API
 */
interface SpamApiResponse {
    status?: string;
    message?: string;
    reasoning?: string;
    processing_time_ms?: number;
    cached?: boolean;
}

interface CachedSpamApiResponse extends SpamApiResponse {
    timestamp: number;
}

interface Response {
    result: 'success' | 'error' | 'pending' | 'not_supported';
    contract_spam_status?: 'spam' | 'not_spam';
    message?: string;
    timestamp: number;
}

function getContractSpamStatus(apiResponse: SpamApiResponse): Response {
    return {
        result: 'success',
        contract_spam_status: apiResponse.reasoning === 'legitimate' ? 'not_spam' : 'spam',
        message: apiResponse.message,
        timestamp: Date.now(),
    };
}

// add chains as they are added to the model
export const CHAIN_ID_MAP: Record<string, number> = {
    mainnet: 1,
    base: 8453,
    polygon: 137,
    matic: 137,
    'arbitrum-one': 42161,
    avalanche: 43114,
    // optimism: 10,
    // bsc: 56,
    // unichain: 10000,
};
const TIMEOUT_MS = 60000;
const STALE_MS = 24 * 60 * 60 * 1000; // 1 day
const CACHE_TTL = 30 * 24 * 60 * 60; // 30 days

/**
 * Maps network ID to its corresponding chain ID
 * @param networkId The network ID (e.g., 'mainnet', 'polygon')
 * @returns The corresponding chain ID (e.g., 1 for Ethereum mainnet)
 */
function getChainId(networkId: string): number | undefined {
    return CHAIN_ID_MAP[networkId];
}

/**
 * Queries the contract status API to check if a contract is spam
 * Immediately returns pending status if not in cache and triggers background fetch
 * @param contractAddress The contract address to check
 * @param networkId The network ID (e.g., 'mainnet')
 * @returns Promise resolving to a Response
 */
export async function querySpamScore(contractAddress: string, networkId: string): Promise<Response> {
    const chainId = getChainId(networkId);
    if (!chainId) {
        return {
            result: 'not_supported',
            message: `Network ${networkId} is not supported for spam scoring`,
            timestamp: Date.now(),
        };
    }

    const cacheKey = getSpamScoreKey(contractAddress, networkId);

    // First check cache
    try {
        const cachedData = await getFromCache<CachedSpamApiResponse>(cacheKey);

        if (cachedData) {
            console.log(`Retrieved spam score from cache for ${contractAddress} on ${networkId}`);

            if (!cachedData.timestamp || Date.now() - cachedData.timestamp > STALE_MS) {
                Promise.resolve().then(() => {
                    fetchAndCacheSpamScore(contractAddress, chainId, cacheKey).catch((error) =>
                        console.error('Background fetch error:', error)
                    );
                });
            }

            return {
                contract_spam_status: getContractSpamStatus(cachedData),
                result: 'success',
            };
        }
    } catch (error) {
        console.error('Error checking cache: ', error, ', fetching from API');
    }

    // Not in cache - trigger background fetch and return pending status
    // Use Promise.resolve().then() to ensure this runs after the response is sent
    Promise.resolve().then(() => {
        fetchAndCacheSpamScore(contractAddress, chainId, cacheKey).catch((error) =>
            console.error('Background fetch error:', error)
        );
    });

    return {
        result: 'pending',
        message: 'Spam score check in progress',
    };
}

/**
 * Fetch spam score from API and update cache in the background
 * This function is meant to be called asynchronously after returning a response to the client
 * @param contractAddress The contract address to check
 * @param chainId The chain ID
 * @param cacheKey The Redis cache key
 */
async function fetchAndCacheSpamScore(contractAddress: string, chainId: number, cacheKey: string): Promise<void> {
    try {
        console.log(`Background fetch of spam score for ${contractAddress} on ${chainId}`);

        const response = await withTimeout<SpamScoreResponse>(
            fetch(`${config.spamApiUrl}/v1/contract/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    accept: 'application/json',
                },
                body: JSON.stringify({ addresses: [contractAddress], chain_id: chainId }),
            }).then(async (res) => {
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Failed to fetch spam score: ${res.status} ${errorText}`);
                }
                const response = await res.json();
                if (!response[contractAddress]) {
                    throw new Error(`Contract ${contractAddress} not found in response`);
                }
                // If Spam API model fails it defaults to "false" with "Error" in the message. We don't want to cache that.
                // This is fragile but that needs to be fixed upstream
                if (response.message?.startsWith('Error')) {
                    throw new Error(response.message);
                }
                return response[contractAddress];
            }),
            TIMEOUT_MS,
            'Spam scoring API request timed out'
        );

        console.log(`Caching spam score for ${contractAddress} on ${chainId}`);
        await setInCache(cacheKey, { ...response, timestamp: Date.now() }, CACHE_TTL);
    } catch (error) {
        console.error(`Error fetching spam score for ${contractAddress} on ${chainId}:`, error);
    }
}
