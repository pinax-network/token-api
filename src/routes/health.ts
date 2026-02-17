import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import client from '../clickhouse/client.js';
import { config } from '../config.js';
import { withErrorResponses } from '../utils.js';

const healthResponseSchema = z.object({
    status: z.string(),
});

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Health Check',
        description: 'Verifies that all database connections are established.',
        tags: ['Monitoring'],
        responses: {
            200: {
                description: 'All database connections are healthy',
                content: {
                    'application/json': {
                        schema: resolver(healthResponseSchema),
                        examples: {
                            example: {
                                summary: 'Healthy',
                                value: { status: 'OK' },
                            },
                        },
                    },
                },
            },
        },
    })
);

const route = new Hono();

route.get('/health', openapi, async (c) => {
    // Ping each unique cluster to verify DB connections
    const pingedClusters = new Set<string>();
    const pingPromises: Promise<void>[] = [];

    for (const network of config.networks) {
        const networkDb =
            config.balancesDatabases[network] ||
            config.transfersDatabases[network] ||
            config.nftDatabases[network] ||
            config.dexDatabases[network] ||
            config.contractDatabases[network];

        if (!networkDb || pingedClusters.has(networkDb.cluster)) continue;
        pingedClusters.add(networkDb.cluster);

        pingPromises.push(
            (async () => {
                const response = await client({ network }).ping();
                if (!response.success) {
                    throw new Error(`Database ping failed for cluster ${networkDb.cluster}`);
                }
            })()
        );
    }

    await Promise.all(pingPromises);
    return c.json({ status: 'OK' });
});

export default route;
