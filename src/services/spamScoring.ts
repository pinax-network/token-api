/**
 * Service for retrieving spam scores for contracts
 */

/**
 * Interface for spam score response from the external API
 */
interface SpamScoreResponse {
    result: 'success' | 'error';
    isSpam?: boolean;
    message?: string;
}

const SUPPORTED_CHAINS = ['mainnet'];

/**
 * Queries the contract status API to check if a contract is spam
 * @param contractAddress The contract address to check
 * @returns Promise resolving to a SpamScoreResponse
 */
export async function querySpamScore(contractAddress: string, networkId: string): Promise<SpamScoreResponse> {
    try {
        if (!SUPPORTED_CHAINS.includes(networkId)) {
            return {
                result: 'error',
                message: `Network ${networkId} is not supported`,
            };
        }
        const response = await fetch('https://token-api-server-874564579341.us-central1.run.app/contracts/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({ address: contractAddress.toLowerCase() }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        return {
            result: 'success',
            isSpam: Boolean(data.contract_spam_status),
            message: data.message,
        };
    } catch (error) {
        console.error('Error querying spam score:', error);
        return {
            result: 'error',
            message: `Error querying spam score: ${error}`,
        };
    }
}
