import { createClient } from '@clickhouse/client-web';
import type { WebClickHouseClientConfigOptions } from '@clickhouse/client-web/dist/config.js';
import { APP_NAME, config } from '../config.js';

interface ClientOptions extends WebClickHouseClientConfigOptions {
    network?: string;
}

function getClusterForNetwork(network: string): { url: string; username?: string; password?: string } | null {
    // Try to find cluster from any database type for this network
    const networkDb =
        config.balancesDatabases[network] ||
        config.transfersDatabases[network] ||
        config.nftDatabases[network] ||
        config.dexDatabases[network] ||
        config.contractDatabases[network];

    if (!networkDb || !networkDb.cluster) {
        return null;
    }

    const cluster = config.clusters[networkDb.cluster];
    if (!cluster) {
        return null;
    }

    return {
        url: cluster.url,
        username: cluster.username,
        password: cluster.password,
    };
}

const client = (custom_config?: ClientOptions) => {
    let url = config.url;
    let username = config.username;
    let password = config.password;

    // If network is provided and we have cluster config, use cluster-specific credentials
    if (custom_config?.network) {
        const clusterConfig = getClusterForNetwork(custom_config.network);
        if (clusterConfig) {
            url = clusterConfig.url;
            // Use cluster credentials if provided, otherwise fall back to env credentials
            username = clusterConfig.username ?? config.username;
            password = clusterConfig.password ?? config.password;
        }
    }

    const clientConfig: WebClickHouseClientConfigOptions = {
        application: APP_NAME,
        url,
        database: config.database,
        username,
        password,
        keep_alive: {
            enabled: false, // disable HTTP keep alive for immediate return
        },
        ...custom_config,
        clickhouse_settings: {
            allow_experimental_object_type: 1,
            output_format_json_quote_64bit_integers: 0,
            readonly: '0',
            interactive_delay: '500000', // Interval between query progress reports in microseconds
            max_execution_time: config.maxQueryExecutionTime,
            use_query_cache: 1,
            enable_writes_to_query_cache: 1,
            enable_reads_from_query_cache: 1,
            query_cache_nondeterministic_function_handling: 'save',
            query_cache_ttl: config.cacheDurations[0], // Make first cache duration value the default for all endpoints
            ...custom_config?.clickhouse_settings,
        },
    };

    return createClient(clientConfig);
};

export default client;
