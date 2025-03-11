import { FastMCP, UserError } from "fastmcp";
import { z } from 'zod';
import { evmAddress } from "../types/zod.js";
import { config } from "../config.js";

const API_URL = `http://${config.hostname}:${config.port}`;
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

mcp.addTool({
    name: "tokenBalance",
    description: "Get ERC-20 token balance for an account, provided by the Pinax Token API",
    parameters: z.object({
        address: evmAddress
    }),
    execute: async (args) => {
        const response = await fetch(`${API_URL}/balances/evm/${args.address}`);

        if (response.ok) {
            const json = await response.json();

            if (!json)
                throw new UserError(`Error parsing API response:\n${JSON.stringify(json)}`);

            return JSON.stringify(json);
        } else {
            throw new UserError(`API response not ok: [${response.status}] ${response.statusText}`);
        }
    },
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