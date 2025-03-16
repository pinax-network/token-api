import { Resource, ResourceTemplate, UserError } from "fastmcp";
import { sqlQueries } from "../sql/index.js";

// Resource template for MCP clients that supports using it
export const resourceTemplates: ResourceTemplate[] = [
    {
        uriTemplate: "file:///sql/{name}/{chain_type}.sql",
        name: "Example SQL query",
        mimeType: "text/plain",
        arguments: [
            {
                name: "name",
                description: "Name of the SQL query",
                // @ts-ignore See https://github.com/punkpeye/fastmcp/issues/20
                required: true,
                complete: async (value) => {
                    return { values: Object.keys(sqlQueries).filter(v => v.includes(value)) };
                },
            },
            {
                name: "chain_type",
                description: `Chain type (e.g. 'evm')`,
                // @ts-ignore
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
    }
];

// Map SQL queries to static resources for MCP clients not supporting resource template
export const resources: Resource[] = Object.entries(sqlQueries).reduce((acc: Resource[], [name, chains]) => {
    for (const [chain, sql] of Object.entries(chains)) {
        acc.push({
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

    return acc;
}, []);