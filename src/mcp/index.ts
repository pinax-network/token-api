import { FastMCP, UserError } from "fastmcp";
import { z } from 'zod';
import { makeQuery } from "../clickhouse/makeQuery.js";
// From https://github.com/ClickHouse/clickhouse-js/blob/6e26010036bc108c835d16c5a4904c6dc6039e70/packages/client-common/src/data_formatter/format_query_params.ts#L5
// Allows for safe quoting of variables in SQL queries when not able to use query params
import { formatQueryParams } from "@clickhouse/client-common";
import { file } from "bun";
import { sqlQueries } from "../sql/index.js";

const mcp = new FastMCP({
    name: "Pinax Token API MCP Server",
    version: "1.0.0",
});

// Catch session errors (default MCP SDK timeout of 10 seconds) and close connection
mcp.on("connect", (event) => {
    const session = event.session;
    session.on('error', async (e) => {
        console.log(`[${session}] Error:`, e.error);
        await session.close();
    });
});

mcp.on("disconnect", (event) => {
    const session = event.session;
    session.removeAllListeners();
});

async function runSQLMCP(sql: string): Promise<string> {
    let response;
    try {
        response = await makeQuery(sql);
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

function escapeSQL(value: string): string {
    return `"${formatQueryParams({ value })}"`; // Wrap in double quotes
}

mcp.addTool({
    name: "list_databases",
    description: "List available databases",
    parameters: z.object({}), // Always needs a parameter (even if empty)
    execute: async () => {
        return runSQLMCP("SHOW DATABASES");
    },
});

mcp.addTool({
    name: "list_tables",
    description: "List available tables from a database",
    parameters: z.object({
        database: z.string() // TODO: Add validation for allowed databases on ClickHouse side (user permissions)
    }),
    execute: async (args) => {
        // Filter out backfill tables as well (TODO: could be done with user permissions ?)
        return runSQLMCP(`SHOW TABLES FROM ${escapeSQL(args.database)} NOT LIKE '%backfill%'`);
    },
});

mcp.addTool({
    name: "describe_table",
    description: "Describe the schema of a table from a database",
    parameters: z.object({
        database: z.string(),
        table: z.string(),
    }),
    execute: async (args) => {
        return runSQLMCP(`DESCRIBE ${escapeSQL(args.database)}.${escapeSQL(args.table)}`);
    },
});

mcp.addTool({
    name: "run_query",
    description: "Run a read-only SQL query",
    parameters: z.object({
        query: z.string()
    }),
    execute: async (args) => {
        return runSQLMCP(args.query);
    },
});

// Resource template for MCP clients that supports using it

mcp.addResourceTemplate({
    uriTemplate: "file:///sql/{name}/{chain_type}.sql",
    name: "Example SQL query",
    mimeType: "text/plain",
    arguments: [
        {
            name: "name",
            description: "Name of the SQL query",
            // @ts-ignore
            required: true,
            complete: async () => {
                return { values: Object.keys(sqlQueries) };
            },
        },
        {
            name: "chain_type",
            description: `Chain type (e.g. 'evm')`,
            // @ts-ignore See https://github.com/punkpeye/fastmcp/issues/20
            required: true,
            complete: async () => {
                return { values: ['evm'] };
            },
        },
    ],
    load: async ({ name, chain_type }) => {
        if (!name || !chain_type)
            throw new UserError(`SQL query name and chain type are required`);

        const examples = sqlQueries[name];
        if (!examples)
            throw new UserError(`Invalid SQL query name specified, valid SQL queries are ${Object.keys(sqlQueries)}`);

        if (!(chain_type in examples))
            throw new UserError(`Invalid chain type specified, valid chain types are ${Object.keys(examples)}`);

        return {
            text: `${examples[chain_type]}`,
        };
    },
});

// Map SQL queries to static resources for MCP clients not supporting resource template
Object.entries(sqlQueries).map(([name, chains]) => {
    for (const [chain, sql] of Object.entries(chains)) {
        mcp.addResource({
            name: `sql_${chain}_${name}`,
            description: `'${chain}' SQL query example`,
            uri: `file://sql/${name}/${chain}.sql`,
            mimeType: "text/plain",
            load: async () => {
                return {
                    text: sql
                };
            }
        });
    }
});

mcp.addPrompt({
    name: "native_token_queries",
    description: "Guidance on the format to use for queries related to the native token contract",
    load: async () => {
        return "You can use the SQL file resources to run queries for the native token contract. You must use the exact spelling of `native` for the contract filter.";
    }
});

export async function startMcpServer() {
    await mcp.start({
        transportType: "sse",
        sse: {
            endpoint: "/sse",
            port: 8080,
        },
    });  
}