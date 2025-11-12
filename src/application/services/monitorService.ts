import { NetworksRegistry } from '@pinax/graph-networks-registry';
import client from '../../infrastructure/clickhouse/client.js';
import { config, GIT_APP } from '../../config.js';
import { logger } from '../../infrastructure/logger.js';

type DatabaseStatus = 'up' | 'down' | 'slow';
type ApiStatus = 'up' | 'down' | 'partial' | 'skipped';
type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';

const registry = await NetworksRegistry.fromLatestVersion();

async function validateNetworks() {
    if (config.skipNetworksValidation) return;

    if (
        !config.networks.includes(config.defaultEvmNetwork) &&
        !config.networks.includes(config.defaultSvmNetwork) &&
        !config.networks.includes(config.defaultTvmNetwork)
    ) {
        throw new Error('Default network for EVM, SVM or TVM not found');
    }

    const query = 'SHOW DATABASES';
    const result = await client({ database: config.database }).query({ query, format: 'JSONEachRow' });
    const dbs = await result.json<{ name: string }>();
    for (const network of config.networks) {
        if (
            !dbs.find(
                (db) =>
                    db.name === config.tokenDatabases[network]?.database ||
                    db.name === config.nftDatabases[network]?.database ||
                    db.name === config.uniswapDatabases[network]?.database
            )
        ) {
            throw new Error(`Databases for ${network} not found`);
        }
    }
}

await validateNetworks();

logger.trace('Supported networks:\n', config.networks);
logger.trace(`Default EVM network: ${config.defaultEvmNetwork}`);
logger.trace(`Default SVM network: ${config.defaultSvmNetwork}`);
logger.trace(`Default TVM network: ${config.defaultTvmNetwork}`);

export class MonitorService {
    public getVersionInfo() {
        return GIT_APP;
    }

    public getNetwork(id: string) {
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

    public getNetworks() {
        return config.networks
            .map((id) => this.getNetwork(id))
            .sort((a, b) => {
                return a.id && b.id ? a.id.localeCompare(b.id) : -1;
            });
    }

    public async evaluateHealth(skipEndpoints: boolean) {
        const startTime = Date.now();
        const requestTime = new Date(startTime).toISOString().replace('T', ' ').substring(0, 19);

        const dbStatus = await this.checkDatabase();
        let overallStatus: OverallStatus = dbStatus === 'down' ? 'unhealthy' : dbStatus === 'slow' ? 'degraded' : 'healthy';

        let apiStatus: ApiStatus = 'skipped';

        if (!skipEndpoints) {
            try {
                apiStatus = await this.checkApiEndpoints();
                if (apiStatus === 'down') {
                    overallStatus = 'unhealthy';
                } else if (apiStatus === 'partial' && overallStatus === 'healthy') {
                    overallStatus = 'degraded';
                }
            } catch (error) {
                apiStatus = 'down';
                overallStatus = 'unhealthy';
                logger.error('Health check endpoints verification failed', error);
            }
        } else {
            if (dbStatus === 'down') {
                overallStatus = 'unhealthy';
            } else if (dbStatus === 'slow') {
                overallStatus = 'degraded';
            } else {
                overallStatus = 'healthy';
            }
        }

        return {
            status: overallStatus,
            checks: {
                database: dbStatus,
                api_endpoints: apiStatus,
            },
            request_time: requestTime,
            duration_ms: Date.now() - startTime,
        } as const;
    }

    private async checkDatabase(): Promise<DatabaseStatus> {
        try {
            const dbStart = Date.now();
            const response = await client().ping();
            const responseTime = Date.now() - dbStart;

            if (!response.success) {
                return 'down';
            }

            if (responseTime > config.degradedDbResponseTime) {
                return 'slow';
            }

            return 'up';
        } catch (error) {
            logger.error('Database health check failed', error);
            return 'down';
        }
    }

    private async checkApiEndpoints(): Promise<ApiStatus> {
        const baseUrl = `http://${config.hostname}:${config.port}`;
        const testEndpoints = [
            '/openapi',
            '/v1/networks',
            '/v1/version',
            '/v1/evm/nft/ownerships?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&network=mainnet',
            '/v1/evm/nft/collections?contract=0xbd3531da5cf5857e7cfaa92426877b022e612cf8&network=mainnet',
            '/v1/evm/nft/items?contract=0xbd3531da5cf5857e7cfaa92426877b022e612cf8&token_id=5712&network=mainnet',
            '/v1/evm/nft/transfers?network=mainnet',
            '/v1/evm/nft/holders?contract=0xbd3531da5cf5857e7cfaa92426877b022e612cf8&network=mainnet',
            '/v1/evm/nft/sales?network=mainnet',
            '/v1/evm/balances?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&network=mainnet',
            '/v1/svm/balances?owner=GXYBNgyYKbSLr938VJCpmGLCUaAHWsncTi7jDoQSdFR9&network=solana',
            '/v1/evm/transfers?network=mainnet',
            '/v1/evm/transfers?network=solana',
            '/v1/evm/tokens?contract=0xc944e90c64b2c07662a292be6244bdf05cda44a7&network=mainnet',
            '/v1/evm/holders?contract=0xc944e90c64b2c07662a292be6244bdf05cda44a7&network=mainnet',
            '/v1/evm/pools?network=mainnet',
            '/v1/svm/pools?network=solana',
            '/v1/evm/swaps?network=mainnet',
            '/v1/svm/swaps?network=solana',
            '/v1/evm/pools/ohlc?pool=0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640&network=mainnet',
            '/v1/evm/prices/ohlc?contract=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&network=mainnet',
            '/v1/evm/balances/historical?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&network=mainnet',
        ];

        const results = await Promise.allSettled(
            testEndpoints.map(async (endpoint) => {
                const response = await fetch(`${baseUrl}${endpoint}`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(config.maxQueryExecutionTime * 1000),
                });

                const working = response.status === 200;
                if (!working) {
                    logger.error(
                        `Health check failed for endpoint ${endpoint}: HTTP ${response.status} - ${response.statusText || 'Unknown error'}`
                    );
                }

                return working;
            })
        );

        let workingEndpoints = 0;
        let totalEndpoints = 0;

        for (const result of results) {
            totalEndpoints += 1;
            if (result.status === 'fulfilled' && result.value) {
                workingEndpoints += 1;
            }
        }

        if (workingEndpoints === 0) {
            return 'down';
        }

        if (workingEndpoints < totalEndpoints) {
            return 'partial';
        }

        return 'up';
    }
}
