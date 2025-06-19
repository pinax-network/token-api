import { z } from "zod";
import { escapeSQL, runSQLMCP } from "./utils.js";
import { Tool } from "fastmcp";
import { config } from "../config.js";

export default [
    {
        name: "list_databases",
        description: "List available databases",
        parameters: z.object({}), // Always needs a parameter (even if empty)
        execute: async (_, { reportProgress }) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const results = await Promise.all(
                        Object.values(config.tokenDatabases).concat(
                            Object.values(config.nftDatabases),
                            Object.values(config.uniswapDatabases)
                        ).map(async (db) => {
                            const [network, suffix] = db.split(':', 2);
                            if (!suffix)
                                throw new Error(`Could not parse suffix for network: ${network}`);

                            const [name, version] = suffix.split('@', 2);
                            const query = `SELECT comment FROM system.databases WHERE name = ${escapeSQL(db).replaceAll('"', "'")};`;
                            const result = JSON.parse(await runSQLMCP(query, reportProgress));
                            let description = '';

                            if (result && result.length > 0)
                                description = result[0]?.comment ?? '';

                            return {
                                database: db,
                                network,
                                name, 
                                version,
                                description
                            };
                        })
                    );
        
                    resolve(JSON.stringify(results));
                } catch (error) {
                    reject(error);
                }
            });
        },
    },
    {
        name: "list_tables",
        description: "List available tables from a database",
        parameters: z.object({
            database: z.string() // TODO: Add validation for allowed databases on ClickHouse side (user permissions)
        }),
        execute: async (args, { reportProgress }) => {
            // Filter out backfill tables as well (TODO: could be done with user permissions ?)
            const query = `SELECT name, comment AS description
                FROM system.tables
                WHERE
                    database = ${escapeSQL(args.database).replaceAll('"', "'")}
                    AND name NOT LIKE 'backfill_%'
                    AND name NOT LIKE '.inner_%'
                    AND name NOT LIKE '%_mv'
                    AND name NOT LIKE 'cursors';
                `;
            return runSQLMCP(query, reportProgress);
        },
    },
    {
        name: "describe_table",
        description: "Describe the schema of a table from a database",
        parameters: z.object({
            database: z.string(),
            table: z.string(),
        }),
        execute: async (args, { reportProgress }) => {
            return runSQLMCP(`DESCRIBE ${escapeSQL(args.database)}.${escapeSQL(args.table)}`, reportProgress);
        },
    },
    {
        name: "run_query",
        description: "Run a read-only SQL query",
        parameters: z.object({
            query: z.string()
        }),
        execute: async (args, { reportProgress }) => {
            return runSQLMCP(args.query, reportProgress);
        },
    },
] as Tool<undefined, z.ZodTypeAny>[];