import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import { NetworksRegistry } from "@pinax/graph-networks-registry";
import { z } from 'zod';
import client from '../clickhouse/client.js';
import { logger } from '../logger.js';
import { config, DB_SUFFIX, DEFAULT_NETWORK_ID } from '../config.js';

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
    if (!config.networks.includes(DEFAULT_NETWORK_ID)) {
        throw new Error(`Default network ${DEFAULT_NETWORK_ID} not found`);
    }
    const query = `SHOW DATABASES LIKE '%:${DB_SUFFIX}'`;
    const result = await client({ database: config.database }).query({ query, format: "JSONEachRow" });
    const dbs = await result.json<{ name: string; }>();
    for (const network of config.networks) {
        if (!dbs.find(db => db.name === `${network}:${DB_SUFFIX}`)) {
            throw new Error(`Database ${network}:${DB_SUFFIX} not found`);
        }
    }
}

// store networks in memory
// this is a workaround to avoid loading networks from the database on every request
await validateNetworks();
// z.enum argument type definition requires at least one element to be defined
export const networkIdSchema = z.enum([DEFAULT_NETWORK_ID]).openapi({ description: "The Graph Network ID https://thegraph.com/networks", example: DEFAULT_NETWORK_ID });
logger.trace(`Supported networks:\n`, config.networks);
logger.trace(`Default network: ${DEFAULT_NETWORK_ID}`);

route.get('/networks', openapi, async (c) => {
    return c.json({ networks: config.networks.map(id => getNetwork(id)) });
});

export default route;