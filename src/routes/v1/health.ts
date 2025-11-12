import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod';
import { monitorController } from '../../application/container.js';
import { dateTimeSchema } from '../../types/zod.js';
import { validatorHook, withErrorResponses } from '../../utils.js';

const querySchema = monitorController.healthQuerySchema;

const healthResponseSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    checks: z.object({
        database: z.enum(['up', 'down', 'slow']),
        api_endpoints: z.enum(['up', 'down', 'partial', 'skipped']),
    }),
    request_time: dateTimeSchema,
    duration_ms: z.number(),
});
type HealthResponse = z.infer<typeof healthResponseSchema>;

const openapi = describeRoute(
    withErrorResponses({
        summary: 'Health Check',
        description:
            'Returns API operational status and dependency health with optional endpoint testing.\n\nUse `skip_endpoints` to bypass endpoint responses checks.',
        tags: ['Monitoring'],
        responses: {
            200: {
                description: 'API is healthy or degraded',
                content: {
                    'application/json': {
                        schema: resolver(healthResponseSchema),
                        examples: {
                            healthy: {
                                summary: 'Healthy API',
                                value: {
                                    status: 'healthy',
                                    checks: {
                                        database: 'up',
                                        api_endpoints: 'up',
                                    },
                                    request_time: '2025-08-06 12:00:00',
                                    duration_ms: 1250,
                                },
                            },
                            degraded: {
                                summary: 'Degraded API',
                                value: {
                                    status: 'degraded',
                                    checks: {
                                        database: 'slow',
                                        api_endpoints: 'partial',
                                    },
                                    request_time: '2025-08-06 12:00:00',
                                    duration_ms: 3400,
                                },
                            },
                            skipped: {
                                summary: 'Database-only check',
                                value: {
                                    status: 'healthy',
                                    checks: {
                                        database: 'up',
                                        api_endpoints: 'skipped',
                                    },
                                    request_time: '2025-08-06 12:00:00',
                                    duration_ms: 125,
                                },
                            },
                        },
                    },
                },
            },
            503: {
                description: 'API is unhealthy',
                content: {
                    'application/json': {
                        schema: resolver(healthResponseSchema),
                        examples: {
                            unhealthy: {
                                summary: 'Unhealthy API',
                                value: {
                                    status: 'unhealthy',
                                    checks: {
                                        database: 'down',
                                        api_endpoints: 'down',
                                    },
                                    request_time: '2025-08-06 12:00:00',
                                    duration_ms: 5000,
                                },
                            },
                        },
                    },
                },
            },
        },
    })
);

const route = new Hono<{ Variables: { validatedData: z.infer<typeof querySchema> } }>();

route.get('/health', openapi, validator('query', querySchema, validatorHook), monitorController.healthHandler());

export default route;
