import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { resolver } from 'hono-openapi/valibot'
import * as v from 'valibot'
import { config  } from '../config.js'
import { NetworksRegistry } from "@pinax/graph-networks-registry";

const registry = await NetworksRegistry.fromLatestVersion();

const route = new Hono();

const networksSchema = v.object({
    id: v.string(),
    fullName: v.string(),
    shortName: v.string(),
    caip2Id: v.string(),
    networkType: v.string(),
    icon: v.object({
        web3Icons: v.object({
            name: v.string(),
        }),
    }),
    alias: v.array(v.string()),
});

const responseSchema = v.object({
    networks: v.array(networksSchema),
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
    for (const id of config.networks.split(',')) {
        networks.push(getNetwork(id));
    }
    return c.json({networks});
});

export default route;