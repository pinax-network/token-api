// From https://github.com/ClickHouse/clickhouse-js/blob/6e26010036bc108c835d16c5a4904c6dc6039e70/packages/client-common/src/data_formatter/format_query_params.ts#L5
// Allows for safe quoting of variables in SQL queries when not able to use query params
import { formatQueryParams } from "@clickhouse/client-common";
import { Progress, UserError } from "fastmcp";
import { makeQuery } from "../clickhouse/makeQuery.js";
import { config } from "../config.js";

export async function runSQLMCP(sql: string, reportProgress?: (progress: Progress) => Promise<void>): Promise<string> {
    let response;
    try {
        response = await makeQuery(sql, {}, { username: config.mcpUsername, password: config.mcpPassword }, reportProgress);
    } catch (error) {
        throw new UserError(`Error while running SQL query: ${error}`);
    }

    if (response.data) {
        const json = JSON.stringify(response);

        if (!json)
            throw new UserError(`Error parsing SQL query response to JSON`);

        return JSON.stringify(json);
    } else {
        throw new UserError(`SQL query response didn't contain any data.`);
    }
}

export function escapeSQL(value: string): string {
    return `"${formatQueryParams({ value })}"`; // Wrap in double quotes
}