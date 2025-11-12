import type { WebClickHouseClientConfigOptions } from '@clickhouse/client-web/dist/config.js';
import type { Context } from 'hono';
import { z } from 'zod';
import type { ApiUsageResponse } from '../../types/zod.js';
import type { BaseService, NetworkDatabaseConfig } from '../services/baseService.js';

export interface QueryKeyConfig {
    key: string;
    errorMessage?: string;
}

export interface QueryHandlerOptions<TSchema extends z.ZodTypeAny> {
    schema: TSchema;
    query: QueryKeyConfig | QueryKeyConfig[];
    getNetworkId?: (params: z.infer<TSchema>) => string;
    transformParams?: (
        params: z.infer<TSchema>,
        dbConfig: NetworkDatabaseConfig
    ) => Record<string, string | number | string[] | boolean>;
    buildQueryOptions?: (
        params: z.infer<TSchema>,
        dbConfig: NetworkDatabaseConfig
    ) => WebClickHouseClientConfigOptions | undefined;
    postProcess?: (
        result: ApiUsageResponse,
        params: z.infer<TSchema>,
        dbConfig: NetworkDatabaseConfig
    ) => void | Promise<void>;
    missingNetworkMessage?: (params: z.infer<TSchema>, networkId: string) => string;
}

export class BaseQueryController<TService extends BaseService> {
    constructor(protected readonly service: TService) {}

    public createHandler<TSchema extends z.ZodTypeAny>(
        options: QueryHandlerOptions<TSchema>
    ): (ctx: Context) => Promise<Response> {
        const queryConfigs = Array.isArray(options.query) ? options.query : [options.query];

        return async (ctx: Context) => {
            const rawParams = (ctx.req as unknown as { valid?: (key: string) => unknown }).valid?.('query');
            const parsed = options.schema.parse(rawParams ?? ctx.req.query());

            const networkId = options.getNetworkId ? options.getNetworkId(parsed) : (parsed as { network?: string }).network;
            if (!networkId) {
                return ctx.json({ error: 'Network not provided' }, 400);
            }

            const dbConfig = this.service.getDatabaseConfig(networkId);
            if (!dbConfig) {
                const message = options.missingNetworkMessage
                    ? options.missingNetworkMessage(parsed, networkId)
                    : `Network not found: ${networkId}`;
                return ctx.json({ error: message }, 400);
            }

            const queries: string[] = [];
            for (const config of queryConfigs) {
                const query = this.service.getQuery(config.key, dbConfig.type);
                if (!query) {
                    return ctx.json(
                        { error: config.errorMessage ?? 'Query could not be loaded' },
                        500
                    );
                }
                queries.push(query);
            }

            const params = options.transformParams ? options.transformParams(parsed, dbConfig) : (parsed as Record<string, string | number | string[] | boolean>);
            const queryOptions = options.buildQueryOptions?.(parsed, dbConfig);
            const result = await this.service.executeQueries(ctx, queries, params, queryOptions);

            if (!('status' in result)) {
                await options.postProcess?.(result, parsed, dbConfig);
            }

            return this.service.sendResponse(ctx, result);
        };
    }
}
