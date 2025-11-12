import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import { monitorController } from '../../application/container.js';
import { withErrorResponses } from '../../utils.js';

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
                                value: { networks: [monitorController.getNetwork('mainnet')] },
                            },
                        },
                    },
                },
            },
        },
    })
);

route.get('/networks', openapi, monitorController.networksHandler());

export default route;
