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
        logger.warn(`Network ${id} not found`);
        return {};
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
    if (!config.networks.includes(config.defaultEvmNetwork) && !config.networks.includes(config.defaultSvmNetwork)) {
        throw new Error(`Default network for EVM or SVM not found`);
    }

    const query = `SHOW DATABASES`;
    const result = await client({ database: config.database }).query({ query, format: "JSONEachRow" });
    const dbs = await result.json<{ name: string; }>();
    for (const network of config.networks) {
        if (!dbs.find(db => db.name === config.tokenDatabases[network]?.name
            || db.name === config.nftDatabases[network]?.name
            || db.name === config.uniswapDatabases[network]?.name)
        ) {
            throw new Error(`Databases for ${network} not found`);
        }
    }
}

// store networks in memory
// this is a workaround to avoid loading networks from the database on every request
await validateNetworks();

logger.trace(`Supported networks:\n`, config.networks);
logger.trace(`Default EVM network: ${config.defaultEvmNetwork}`);
logger.trace(`Default SVM network: ${config.defaultSvmNetwork}`);

route.get('/networks', openapi, async (c) => {
    return c.json({ networks: config.networks.map(id => getNetwork(id)) });
});

export default route;
