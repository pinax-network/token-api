import { FastMCP } from "fastmcp";
import { z } from 'zod';

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
    name: "add",
    description: "Add two numbers",
    parameters: z.object({
        a: z.number(),
        b: z.number(),
    }),
    execute: async (args) => {
        return String(args.a + args.b);
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