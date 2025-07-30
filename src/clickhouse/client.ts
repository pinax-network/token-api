import { createClient } from '@clickhouse/client-web';
import type { WebClickHouseClientConfigOptions } from '@clickhouse/client-web/dist/config.js';
import { APP_NAME, config } from '../config.js';

export const MAX_EXECUTION_TIME = 10;

// TODO: Check how to abort previous queries if haven't returned yet
const client = (custom_config?: WebClickHouseClientConfigOptions) => {
    const c = createClient({
        ...config,
        ...custom_config,
        clickhouse_settings: {
            allow_experimental_object_type: 1,
            output_format_json_quote_64bit_integers: 0,
            readonly: '1',
            interactive_delay: '500000', // Interval between query progress reports in microseconds
            max_execution_time: MAX_EXECUTION_TIME, // 10 seconds query timeout to match `fetch` MCP timeout
        },
        application: APP_NAME,
    });
    return c;
};

export default client;
