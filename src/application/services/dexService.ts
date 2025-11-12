import { config } from '../../config.js';
import { UsageQueryExecutor } from '../../infrastructure/query/usageQueryExecutor.js';
import { BaseService, type NetworkDatabaseConfig } from './baseService.js';

export class DexService extends BaseService {
    constructor(executor: UsageQueryExecutor) {
        super(executor);
    }

    public override getDatabaseConfig(networkId: string): NetworkDatabaseConfig | undefined {
        return config.uniswapDatabases[networkId];
    }
}
