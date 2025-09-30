import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { z } from 'zod';
import client from '../../clickhouse/client.js';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import { validatorHook, withErrorResponses } from '../../utils.js';

const querySchema = z.object({
    skip_endpoints: z.optional(z.enum(['true', 'false']).default('true')),
});

const healthResponseSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    checks: z.object({
        database: z.enum(['up', 'down', 'slow']),
        api_endpoints: z.enum(['up', 'down', 'partial', 'skipped']),
    }),
    request_time: z.iso.datetime(),
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

route.get('/health', openapi, validator('query', querySchema, validatorHook), async (c) => {
    const params = c.get('validatedData');
    const startTime = Date.now();
    const skipEndpoints = params.skip_endpoints === 'true';

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Database check
    let dbStatus: 'up' | 'down' | 'slow' = 'up';
    try {
        const dbStart = Date.now();
        const response = await client().ping();
        const dbResponseTime = Date.now() - dbStart;

        if (!response.success) {
            dbStatus = 'down';
            overallStatus = 'unhealthy';
        } else if (dbResponseTime > config.degradedDbResponseTime) {
            dbStatus = 'slow';
            overallStatus = 'degraded';
        }
    } catch (_error) {
        dbStatus = 'down';
        overallStatus = 'unhealthy';
    }

    // API endpoints check (optional)
    let apiStatus: 'up' | 'down' | 'partial' | 'skipped' = 'skipped';

    if (!skipEndpoints) {
        try {
            const baseUrl = `http://${config.hostname}:${config.port}`;

            const testEndpoints = [
                // Monitoring endpoints (no auth required)
                '/openapi',
                '/networks',
                '/version',

                // NFT endpoints
                '/nft/ownerships/evm/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?network_id=mainnet',
                '/nft/collections/evm/0xbd3531da5cf5857e7cfaa92426877b022e612cf8?network_id=mainnet',
                '/nft/items/evm/contract/0xbd3531da5cf5857e7cfaa92426877b022e612cf8/token_id/5712?network_id=mainnet',
                '/nft/activities/evm?network_id=mainnet',
                '/nft/holders/evm/0xbd3531da5cf5857e7cfaa92426877b022e612cf8?network_id=mainnet',
                '/nft/sales/evm?network_id=mainnet',

                // Balance endpoints
                '/balances/evm/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?network_id=mainnet',
                '/balances/svm?network_id=solana',

                // Transfer endpoints
                '/transfers/evm?network_id=mainnet',
                '/transfers/svm?network_id=solana',

                // Token endpoints
                '/tokens/evm/0xc944e90c64b2c07662a292be6244bdf05cda44a7?network_id=mainnet',
                '/holders/evm/0xc944e90c64b2c07662a292be6244bdf05cda44a7?network_id=mainnet',

                // Swap endpoints
                '/swaps/evm?network_id=mainnet',
                '/swaps/svm?network_id=solana',

                // Pool endpoints
                '/pools/evm?network_id=mainnet',

                // OHLC endpoints
                '/ohlc/pools/evm/0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640?network_id=mainnet',
                '/ohlc/prices/evm/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2?network_id=mainnet',

                // Historical endpoints
                '/historical/balances/evm/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?network_id=mainnet',
            ];

            const endpointResults = await Promise.allSettled(
                testEndpoints.map(async (endpoint) => {
                    const response = await fetch(`${baseUrl}${endpoint}`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(config.maxQueryExecutionTime * 1000),
                    });

                    const isWorking = response.status === 200;

                    if (!isWorking)
                        logger.error(
                            `Health check failed for endpoint ${endpoint}: HTTP ${response.status} - ${response.statusText || 'Unknown error'}`
                        );

                    return {
                        endpoint,
                        status: response.status,
                        working: isWorking,
                    };
                })
            );

            const results = endpointResults.map((result) =>
                result.status === 'fulfilled' ? result.value : { working: false }
            );

            const workingEndpoints = results.filter((r) => r.working).length;
            const totalEndpoints = testEndpoints.length;

            if (workingEndpoints === 0) {
                apiStatus = 'down';
                overallStatus = 'unhealthy';
            } else if (workingEndpoints < totalEndpoints) {
                apiStatus = 'partial';
                if (overallStatus === 'healthy') overallStatus = 'degraded';
            } else {
                apiStatus = 'up';
            }
        } catch (_error) {
            apiStatus = 'down';
            overallStatus = 'unhealthy';
        }
    } else {
        // When skipping endpoints, base overall status on database status only
        apiStatus = 'skipped';
        // Assume API endpoints are working if database is working
        if (dbStatus === 'down') {
            overallStatus = 'unhealthy';
        } else if (dbStatus === 'slow') {
            overallStatus = 'degraded';
        } else {
            overallStatus = 'healthy';
        }
    }

    const healthResponse: HealthResponse = {
        status: overallStatus,
        checks: {
            database: dbStatus,
            api_endpoints: apiStatus,
        },
        request_time: new Date(startTime).toISOString().replace('T', ' ').substring(0, 19),
        duration_ms: Date.now() - startTime,
    };

    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    return c.json(healthResponse, httpStatus);
});

export default route;
