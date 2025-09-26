import { createClient } from '@clickhouse/client-web';
import type { WebClickHouseClientConfigOptions } from '@clickhouse/client-web/dist/config.js';
import { APP_NAME, config } from '../config.js';

// TODO: Check how to abort previous queries if haven't returned yet
const client = (custom_config?: WebClickHouseClientConfigOptions) => {
    const baseSettings = {
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
    };

    const c = createClient(
        Object.assign({}, config, custom_config, {
            clickhouse_settings: Object.assign(baseSettings, custom_config?.clickhouse_settings),
            application: APP_NAME,
        })
    );

    return c;
};

export default client;
