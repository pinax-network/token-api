import { config } from '../infrastructure/config.js';
import { executeUsageQuery, type QueryOptions } from '../infrastructure/queryExecutor.js';
import { getFromCache, getSpamScoreKey } from '../infrastructure/redis.js';
import { sqlQueries } from '../sql/index.js';

interface NftItem {
    contract?: string;
    spam_score?: number;
    [key: string]: unknown;
}

export class NftService {
    async getCollections(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.nftDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.nft_metadata_for_collection?.[dbConfig.type];
        if (!query) throw new Error('Query for NFT collections could not be loaded');

        const response = await executeUsageQuery<NftItem>([query], params, { ...options, database: dbConfig.database });

        // Inject spam scores if available
        if ('data' in response && Array.isArray(response.data)) {
            await Promise.all(
                response.data.map(async (item) => {
                    if (item.contract) {
                        const key = getSpamScoreKey(item.contract, network);
                        const score = await getFromCache<number>(key);
                        if (score !== null) {
                            item.spam_score = score;
                        }
                    }
                })
            );
        }

        return response;
    }

    async getItems(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.nftDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.nft_metadata_for_token?.[dbConfig.type];
        if (!query) throw new Error('Query for NFT items could not be loaded');

        return executeUsageQuery([query], params, { ...options, database: dbConfig.database });
    }

    async getOwnerships(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.nftDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.nft_ownerships_for_account?.[dbConfig.type];
        if (!query) throw new Error('Query for NFT ownerships could not be loaded');

        const response = await executeUsageQuery<NftItem>([query], params, { ...options, database: dbConfig.database });

        // Inject spam scores if available
        if ('data' in response && Array.isArray(response.data)) {
            await Promise.all(
                response.data.map(async (item) => {
                    if (item.contract) {
                        const key = getSpamScoreKey(item.contract, network);
                        const score = await getFromCache<number>(key);
                        if (score !== null) {
                            item.spam_score = score;
                        }
                    }
                })
            );
        }

        return response;
    }

    async getSales(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.nftDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.nft_sales?.[dbConfig.type];
        if (!query) throw new Error('Query for NFT sales could not be loaded');

        return executeUsageQuery([query], params, { ...options, database: dbConfig.database });
    }

    async getTransfers(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.nftDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.nft_transfers?.[dbConfig.type];
        if (!query) throw new Error('Query for NFT transfers could not be loaded');

        return executeUsageQuery([query], params, { ...options, database: dbConfig.database });
    }

    async getHolders(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.nftDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        // Note: Using nft_ownerships query for holders as per existing implementation logic if separate query doesn't exist
        // But checking routes/v1/evm/nft/holders/evm.ts, it uses nft_ownerships query with specific params
        const query = sqlQueries.nft_holders?.[dbConfig.type];
        if (!query) throw new Error('Query for NFT holders could not be loaded');

        return executeUsageQuery([query], params, { ...options, database: dbConfig.database });
    }
}

export const nftService = new NftService();
