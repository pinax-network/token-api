import { config } from '../infrastructure/config.js';
import { executeUsageQuery, type QueryOptions } from '../infrastructure/queryExecutor.js';
import { injectSymbol } from '../inject/symbol.js';
import { sqlQueries } from '../sql/index.js';

export class DexService {
    async getDexes(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.uniswapDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.dexes?.[dbConfig.type];
        if (!query) throw new Error('Query for dexes could not be loaded');

        return executeUsageQuery([query], params, { ...options, database: dbConfig.database });
    }

    async getPools(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.uniswapDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.pools?.[dbConfig.type];
        if (!query) throw new Error('Query for pools could not be loaded');

        const response = await executeUsageQuery([query], params, { ...options, database: dbConfig.database });

        if ('data' in response && dbConfig.type === 'evm') {
            injectSymbol(response, network, true);
        }

        return response;
    }

    async getPoolsOhlc(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.uniswapDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.pools_ohlc?.[dbConfig.type];
        if (!query) throw new Error('Query for pools OHLC could not be loaded');

        return executeUsageQuery([query], params, { ...options, database: dbConfig.database });
    }

    async getSwaps(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.uniswapDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.swaps?.[dbConfig.type];
        if (!query) throw new Error('Query for swaps could not be loaded');

        const response = await executeUsageQuery([query], params, { ...options, database: dbConfig.database });

        if ('data' in response && dbConfig.type === 'evm') {
            injectSymbol(response, network, true);
        }

        return response;
    }
}

export const dexService = new DexService();
