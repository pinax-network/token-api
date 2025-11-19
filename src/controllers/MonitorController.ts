import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { monitorService } from '../services/MonitorService.js';
import { booleanFromString, dateTimeSchema } from '../types/zod.js';
import { validatorHook, withErrorResponses } from '../utils.js';

const healthQuerySchema = z.object({
    skip_endpoints: booleanFromString.default(true).optional(),
});

const healthResponseSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    checks: z.object({
        database: z.enum(['up', 'down', 'slow']),
        api_endpoints: z.enum(['up', 'down', 'partial', 'skipped']),
    }),
    request_time: dateTimeSchema,
    duration_ms: z.number(),
});

const versionResponseSchema = z.object({
    version: z.string(),
    date: z.string(),
    commit: z.string(),
});

const networksResponseSchema = z.object({
    networks: z.array(
        z.object({
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
        })
    ),
});

export class MonitorController {
    public route = new Hono();

    constructor() {
        this.setupRoutes();
    }

    private setupRoutes() {
        this.route.get(
            '/health',
            describeRoute(
                withErrorResponses({
                    summary: 'Health Check',
                    description: 'Returns API operational status and dependency health.',
                    tags: ['Monitoring'],
                    responses: {
                        200: {
                            description: 'API is healthy or degraded',
                            content: { 'application/json': { schema: resolver(healthResponseSchema) } },
                        },
                        503: {
                            description: 'API is unhealthy',
                            content: { 'application/json': { schema: resolver(healthResponseSchema) } },
                        },
                    },
                })
            ),
            validator('query', healthQuerySchema, validatorHook),
            async (c) => {
                const params = c.req.valid('query');
                const result = await monitorService.getHealth(params.skip_endpoints);
                const status = result.status === 'unhealthy' ? 503 : 200;

                c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
                c.header('Pragma', 'no-cache');
                c.header('Expires', '0');

                return c.json(result, status);
            }
        );

        this.route.get(
            '/version',
            describeRoute(
                withErrorResponses({
                    summary: 'API Version Info',
                    description: 'Returns API version, build date, and commit information.',
                    tags: ['Monitoring'],
                    responses: {
                        200: {
                            description: 'Successful Response',
                            content: { 'application/json': { schema: resolver(versionResponseSchema) } },
                        },
                    },
                })
            ),
            (c) => {
                return c.json(monitorService.getVersion());
            }
        );

        this.route.get(
            '/networks',
            describeRoute(
                withErrorResponses({
                    summary: 'Supported Networks',
                    description: 'Returns supported blockchain networks with identifiers and metadata.',
                    tags: ['Monitoring'],
                    responses: {
                        200: {
                            description: 'Successful Response',
                            content: { 'application/json': { schema: resolver(networksResponseSchema) } },
                        },
                    },
                })
            ),
            async (c) => {
                const networks = await monitorService.getNetworks();
                return c.json({ networks });
            }
        );
    }
}

export const monitorController = new MonitorController();
