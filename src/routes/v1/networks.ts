import { NetworksRegistry } from '@pinax/graph-networks-registry';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import client from '../../clickhouse/client.js';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import { withErrorResponses } from '../../utils.js';

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
    aliases: z.array(z.string()),
});

const responseSchema = z.object({
    networks: z.array(networksSchema),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Supported Networks',
        description: 'Returns supported blockchain networks with identifiers and metadata.',
        tags: ['Monitoring'],
        responses: {
            200: {
                description: 'Successful Response',
                content: {
                    'application/json': {
                        schema: resolver(responseSchema),
                        examples: {
                            example: {
                                value: { networks: [getNetwork('mainnet')] },
                            },
                        },
                    },
                },
            },
        },
    })
);

export function getNetwork(id: string) {
    const network = registry.getNetworkByGraphId(id);
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
    if (config.skipNetworksValidation) return;

    if (
        !config.networks.includes(config.defaultEvmNetwork) &&
        !config.networks.includes(config.defaultSvmNetwork) &&
        !config.networks.includes(config.defaultTvmNetwork)
    ) {
        throw new Error('Default network for EVM, SVM or TVM not found');
    }

    // Group networks by their cluster
    const networksByCluster = new Map<string, string[]>();
    for (const network of config.networks) {
        const networkDb =
            config.balancesDatabases[network] ||
            config.transfersDatabases[network] ||
            config.nftDatabases[network] ||
            config.dexDatabases[network] ||
            config.contractDatabases[network];

        if (!networkDb) {
            throw new Error(`No database configuration found for network: ${network}`);
        }

        const clusterName = networkDb.cluster;
        if (!networksByCluster.has(clusterName)) {
            networksByCluster.set(clusterName, []);
        }
        networksByCluster.get(clusterName)?.push(network);
    }

    // Validate each network against its cluster
    const query = 'SHOW DATABASES';
    for (const [clusterName, networks] of networksByCluster) {
        const result = await client({ network: networks[0] }).query({ query, format: 'JSONEachRow' });
        const dbs = await result.json<{ name: string }>();
        const dbs_networks = new Set(dbs.map((db) => db.name.split(':')[0]));

        for (const network of networks) {
            if (!dbs_networks.has(network)) {
                throw new Error(`Databases for ${network} not found in cluster ${clusterName}`);
            }
        }
    }
}

// store networks in memory
// this is a workaround to avoid loading networks from the database on every request
await validateNetworks();

logger.trace('Supported networks:\n', config.networks);
logger.trace(`Default EVM network: ${config.defaultEvmNetwork}`);
logger.trace(`Default SVM network: ${config.defaultSvmNetwork}`);
logger.trace(`Default TVM network: ${config.defaultTvmNetwork}`);

route.get('/networks', openapi, async (c) => {
    return c.json({
        networks: config.networks
            .map((id) => getNetwork(id))
            .sort((a, b) => {
                return a.id && b.id ? a.id.localeCompare(b.id) : -1;
            }),
    });
});

export default route;
