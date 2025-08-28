/**
 * Service for retrieving spam scores for contracts
 */
import { withTimeout } from '../utils.js';
import { getFromCache, getSpamScoreKey, setInCache } from './redis.js';

/**
 * Interface for spam score response from the external API
 */
interface SpamScoreResponse {
    result: 'success' | 'error' | 'pending';
    isSpam?: boolean;
    message?: string;
}

const SUPPORTED_CHAINS = ['mainnet'];
const TIMEOUT_MS = 60000;
const SPAM_SCORING_API_URL = 'https://token-api-server-874564579341.us-central1.run.app/contracts/status';

/**
 * Queries the contract status API to check if a contract is spam
 * Immediately returns pending status if not in cache and triggers background fetch
 * @param contractAddress The contract address to check
 * @param networkId The network ID (e.g., 'mainnet')
 * @returns Promise resolving to a SpamScoreResponse
 */
export async function querySpamScore(contractAddress: string, networkId: string): Promise<SpamScoreResponse> {
    if (!SUPPORTED_CHAINS.includes(networkId)) {
        return {
            result: 'error',
            message: `Network ${networkId} is not supported for spam scoring`,
        };
    }

    const cacheKey = getSpamScoreKey(contractAddress, networkId);

    // First check cache
    try {
        const cachedData = await getFromCache<SpamScoreResponse>(cacheKey);

        if (cachedData) {
            console.log(`Retrieved spam score from cache for ${contractAddress} on ${networkId}`);
            return {
                ...cachedData,
                result: 'success',
            };
        }
    } catch (error) {
        console.error('Error checking cache:', error);
    }

    // Not in cache - trigger background fetch and return pending status
    // Use Promise.resolve().then() to ensure this runs after the response is sent
    Promise.resolve().then(() => {
        fetchAndCacheSpamScore(contractAddress, networkId, cacheKey).catch((error) =>
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
 * @param networkId The network ID
 * @param cacheKey The Redis cache key
 */
async function fetchAndCacheSpamScore(contractAddress: string, networkId: string, cacheKey: string): Promise<void> {
    try {
        console.log(`Background fetch of spam score for ${contractAddress} on ${networkId}`);

        const response = await withTimeout<SpamScoreResponse>(
            fetch(SPAM_SCORING_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    accept: 'application/json',
                },
                body: JSON.stringify({ address: contractAddress.toLowerCase() }),
            }).then(async (res) => {
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Failed to fetch spam score: ${res.status} ${errorText}`);
                }
                return res.json();
            }),
            TIMEOUT_MS,
            'Spam scoring API request timed out'
        );

        // Cache the successful response
        if (response?.message && !response.message.startsWith('Error')) {
            console.log(`Caching spam score for ${contractAddress} on ${networkId}`);
            await setInCache(cacheKey, response);
        } else {
            console.warn(`Not caching invalid spam score response for ${contractAddress} on ${networkId}:`, response);
        }
    } catch (error) {
        console.error(`Error fetching spam score for ${contractAddress} on ${networkId}:`, error);
    }
}
