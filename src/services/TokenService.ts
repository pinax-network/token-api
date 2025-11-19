import { config } from '../infrastructure/config.js';
import { executeUsageQuery, type QueryOptions } from '../infrastructure/queryExecutor.js';
import { injectPrices } from '../inject/prices.js';
import { injectSymbol } from '../inject/symbol.js';
import { sqlQueries } from '../sql/index.js';

export class TokenService {
    async getBalances(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.tokenDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.balances_for_account?.[dbConfig.type];
        if (!query) throw new Error('Query for balances could not be loaded');

        const response = await executeUsageQuery([query], params, { ...options, database: dbConfig.database });

        if ('data' in response) {
            if (dbConfig.type === 'evm') {
                injectSymbol(response, network, true);
            }
        }

        return response;
    }

    async getHolders(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.tokenDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.holders_for_contract?.[dbConfig.type];
        if (!query) throw new Error('Query for holders could not be loaded');

        return executeUsageQuery([query], params, { ...options, database: dbConfig.database });
    }

    async getTokens(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.tokenDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.tokens_for_contract?.[dbConfig.type];
        if (!query) throw new Error('Query for tokens could not be loaded');

        const response = await executeUsageQuery([query], params, { ...options, database: dbConfig.database });

        if ('data' in response && dbConfig.type === 'evm') {
            await injectPrices(response, network);
        }

        return response;
    }

    async getTransfers(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.tokenDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.transfers?.[dbConfig.type];
        if (!query) throw new Error('Query for transfers could not be loaded');

        const response = await executeUsageQuery([query], params, { ...options, database: dbConfig.database });

        if ('data' in response && dbConfig.type === 'evm') {
            injectSymbol(response, network, true);
        }

        return response;
    }

    async getPrices(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        // Prices are currently only supported for EVM in the existing routes
        // But we can check if other chains support it or if it's generic
        // Based on existing routes, prices seem to be EVM specific or at least use uniswap DBs

        // Checking existing implementation: src/routes/v1/evm/prices/evm.ts
        // It uses uniswapDatabases
        const dbConfig = config.uniswapDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.prices?.[dbConfig.type];
        if (!query) throw new Error('Query for prices could not be loaded');

        return executeUsageQuery([query], params, { ...options, database: dbConfig.database });
    }

    async getPricesOhlc(network: string, params: Record<string, unknown>, options: QueryOptions = {}) {
        const dbConfig = config.uniswapDatabases[network];
        if (!dbConfig) throw new Error(`Network not found: ${network}`);

        const query = sqlQueries.prices_ohlc?.[dbConfig.type];
        if (!query) throw new Error('Query for prices OHLC could not be loaded');

        return executeUsageQuery([query], params, { ...options, database: dbConfig.database });
    }
}

export const tokenService = new TokenService();
