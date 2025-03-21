import { FastMCP } from "fastmcp";

import { config } from "../config.js";
import { logger } from "../logger.js";
import tools from "./tools.js";
import prompts from "./prompts.js";
import { resources, resourceTemplates } from "./resources.js";

const mcp = new FastMCP({
    name: "Pinax Token API MCP Server",
    version: "1.0.0",
});

// Catch session errors (default MCP SDK timeout of 10 seconds) and close connection
mcp.on("connect", (event) => {
    const session = event.session;
    session.on('error', async (e) => {
        logger.error(`[${session}] Error:`, e.error);
        await session.close();
    });
});

mcp.on("disconnect", (event) => {
    const session = event.session;
    session.removeAllListeners();
});

// Populate server features: Tools, ResourceTemplates, Resources and Prompts
// See https://spec.modelcontextprotocol.io/specification/2024-11-05/server/
tools.map((tool) => mcp.addTool(tool));
resourceTemplates.map((resourceTemplate) => mcp.addResourceTemplate(resourceTemplate));
resources.map((resource) => mcp.addResource(resource));
prompts.map((prompt) => mcp.addPrompt(prompt));

export async function startMcpServer() {
    await mcp.start({
        transportType: "sse",
        sse: {
            endpoint: `/${config.sseEndpoint}`,
            port: config.ssePort,
        },
    });
}