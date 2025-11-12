import type { WebClickHouseClientConfigOptions } from '@clickhouse/client-web/dist/config.js';
import type { Context } from 'hono';
import { sqlQueries } from '../../sql/index.js';
import type { ApiErrorResponse, ApiUsageResponse } from '../../types/zod.js';
import { UsageQueryExecutor } from '../../infrastructure/query/usageQueryExecutor.js';

export type ChainType = 'evm' | 'svm' | 'tvm';

export interface NetworkDatabaseConfig {
    database: string;
    type: ChainType;
}

export type QueryParams = Record<string, string | number | string[] | boolean>;

export type QueryConfig = WebClickHouseClientConfigOptions | undefined;

export abstract class BaseService {
    constructor(protected readonly executor: UsageQueryExecutor) {}

    public getQuery(key: string, chainType: ChainType): string | undefined {
        return sqlQueries[key]?.[chainType];
    }

    public resolveQueries(keys: string[], chainType: ChainType): (string | undefined)[] {
        return keys.map((key) => this.getQuery(key, chainType));
    }

    public async executeQueries<T = unknown>(
        ctx: Context,
        queries: string[],
        params: QueryParams,
        config?: WebClickHouseClientConfigOptions
    ): Promise<ApiUsageResponse | ApiErrorResponse> {
        return this.executor.execute<T>(ctx, queries, params, config);
    }

    public async sendResponse(
        ctx: Context,
        result: ApiUsageResponse | ApiErrorResponse
    ): Promise<Response> {
        return this.executor.send(ctx, result);
    }

    public abstract getDatabaseConfig(networkId: string): NetworkDatabaseConfig | undefined;
}
