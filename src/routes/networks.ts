import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/zod';
import { config  } from '../config.js'
import { NetworksRegistry } from "@pinax/graph-networks-registry";
import { z } from 'zod';

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
                'application/json': { schema: resolver(responseSchema), example: {
                    networks: [
                        getNetwork("mainnet"),
                    ]
                } },
            },
        },
    },
})

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

route.get('/networks', openapi, (c) => {
    const networks = [];
    for (const id of config.networks) {
        networks.push(getNetwork(id));
    }
    return c.json({networks});
});

export default route;