import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import { NetworksRegistry } from "@pinax/graph-networks-registry";
import { z } from 'zod';
import client from '../clickhouse/client.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

const registry = await NetworksRegistry.fromLatestVersion();

const route = new Hono();

const networksSchema = z.object({
    id: z.string(),
    fullName: z.string(),
    shortName: z.string(),
    caip2Id: z.string(),
    networkType: z.string(),
    icon: z.object({
        web3Icons: z.object({
            name: z.string(),
        }),
    }),
    alias: z.array(z.string()),
});

const responseSchema = z.object({
    networks: z.array(networksSchema),
});

const openapi = describeRoute({
    description: 'Get supported networks of the API',
    tags: ['Monitoring'],
    responses: {
        200: {
            description: 'Successful Response',
            content: {
                'application/json': {
                    schema: resolver(responseSchema), example: {
                        networks: [
                            getNetwork("mainnet"),
                        ]
                    }
                },
            },
        },
    },
});

export function getNetwork(id: string) {
    const network = registry.getNetworkById(id);
    if (!network) {
        throw new Error(`Network ${id} not found`);
    }
    return {
        id,
        fullName: network.fullName,
        shortName: network.shortName,
        networkType: network.networkType,
        nativeToken: network.nativeToken,
        caip2Id: network.caip2Id,
        icon: network.icon,
        aliases: network.aliases,
    };
}

async function validateNetworks() {
    if (!config.networks.includes(config.defaultNetwork)) {
        throw new Error(`Default network ${config.defaultNetwork} not found`);
    }
    const query = `SHOW DATABASES LIKE '%:${config.dbEvmSuffix}'`;
    const result = await client({ database: config.database }).query({ query, format: "JSONEachRow" });
    const dbs = await result.json<{ name: string; }>();
    for (const network of config.networks) {
        if (!dbs.find(db => db.name === `${network}:${config.dbEvmSuffix}`)) {
            throw new Error(`Database ${network}:${config.dbEvmSuffix} not found`);
        }
    }
}

// store networks in memory
// this is a workaround to avoid loading networks from the database on every request
await validateNetworks();

logger.trace(`Supported networks:\n`, config.networks);
logger.trace(`Default network: ${config.defaultNetwork}`);

route.get('/networks', openapi, async (c) => {
    return c.json({ networks: config.networks.map(id => getNetwork(id)) });
});

export default route;
