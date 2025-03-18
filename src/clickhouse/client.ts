import { createClient } from "@clickhouse/client-web";
import { APP_NAME, config } from "../config.js";

// TODO: Check how to abort previous queries if haven't returned yet
const client = (database?: string) => {
    const c = createClient({
        ...config,
        database,
        clickhouse_settings: {
            allow_experimental_object_type: 1,
            output_format_json_quote_64bit_integers: 0,
            readonly: "1",
            interactive_delay: '500000', // Interval between query progress reports in microseconds
            max_execution_time: 10, // 10 seconds query timeout to match `fetch` MCP timeout
        },
        application: APP_NAME,
    });
    return c;
};

export default client;