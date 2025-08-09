/**
 * Service for retrieving spam scores for contracts
 */
import { withTimeout } from '../utils.js';
import { getFromCache, getSpamScoreKey, setInCache } from './redis.js';

/**
 * Interface for spam score response from the external API
 */
interface SpamScoreResponse {
    result: 'success' | 'error';
    isSpam?: boolean;
    message?: string;
    cached?: boolean; // Indicator if the response came from cache
}

const SUPPORTED_CHAINS = ['mainnet'];
const TIMEOUT_MS = 10000;
const SPAM_SCORING_API_URL = 'https://token-api-server-874564579341.us-central1.run.app/contracts/status';

/**
 * Queries the contract status API to check if a contract is spam
 * @param contractAddress The contract address to check
 * @param networkId The network ID (e.g., 'mainnet')
 * @returns Promise resolving to a SpamScoreResponse
 */
export async function querySpamScore(contractAddress: string, networkId: string): Promise<SpamScoreResponse> {
    if (!SUPPORTED_CHAINS.includes(networkId)) {
        return {
            result: 'error',
            message: `Network ${networkId} is not supported`,
        };
    }

    const cacheKey = getSpamScoreKey(contractAddress, networkId);
    try {
        const cachedData = await getFromCache<SpamScoreResponse>(cacheKey);

        if (cachedData) {
            console.log(`Retrieved spam score from cache for ${contractAddress} on ${networkId}`);
            return {
                ...cachedData,
                cached: true,
            };
        }

        console.log(`Fetching spam score from API for ${contractAddress} on ${networkId}`);
        const response = await withTimeout(
            fetch(SPAM_SCORING_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    accept: 'application/json',
                },
                body: JSON.stringify({ address: contractAddress.toLowerCase() }),
            }),
            TIMEOUT_MS,
            `Timed out after ${TIMEOUT_MS}ms`
        );

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const data = await response.json();
        if (data.message?.startsWith('Error')) {
            throw new Error(data.message);
        }

        const result: SpamScoreResponse = {
            result: 'success',
            isSpam: Boolean(data.contract_spam_status),
            message: data.message,
        };

        await setInCache(cacheKey, result);

        return result;
    } catch (error) {
        console.error('Error querying spam score:', error);
        return {
            result: 'error',
            message: `Error querying spam score: ${error}`,
        };
    }
}
