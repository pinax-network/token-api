import { NetworksRegistry } from '@pinax/graph-networks-registry';
import client from '../infrastructure/clickhouse.js';
import { config, GIT_APP } from '../infrastructure/config.js';
import { logger } from '../infrastructure/logger.js';

export class MonitorService {
    private registry: NetworksRegistry | null = null;

    async init() {
        this.registry = await NetworksRegistry.fromLatestVersion();
        await this.validateNetworks();

        logger.trace('Supported networks:\n', config.networks);
        logger.trace(`Default EVM network: ${config.defaultEvmNetwork}`);
        logger.trace(`Default SVM network: ${config.defaultSvmNetwork}`);
        logger.trace(`Default TVM network: ${config.defaultTvmNetwork}`);
    }

    getVersion() {
        return GIT_APP;
    }

    async getNetworks() {
        if (!this.registry) await this.init();
        return config.networks
            .map((id) => this.getNetwork(id))
            .sort((a, b) => (a.id && b.id ? a.id.localeCompare(b.id) : -1));
    }

    getNetwork(id: string) {
        if (!this.registry) throw new Error('Registry not initialized');
        const network = this.registry.getNetworkByGraphId(id);
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

    async validateNetworks() {
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

    async getHealth(skipEndpoints: boolean = true) {
        const startTime = Date.now();
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
                    '/v1/networks',
                    '/v1/version',

                    // NFT endpoints
                    '/v1/evm/nft/ownerships?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&network=mainnet',
                    '/v1/evm/nft/collections?contract=0xbd3531da5cf5857e7cfaa92426877b022e612cf8&network=mainnet',
                    '/v1/evm/nft/items?contract=0xbd3531da5cf5857e7cfaa92426877b022e612cf8&token_id=5712&network=mainnet',
                    '/v1/evm/nft/transfers?network=mainnet',
                    '/v1/evm/nft/holders?contract=0xbd3531da5cf5857e7cfaa92426877b022e612cf8&network=mainnet',
                    '/v1/evm/nft/sales?network=mainnet',

                    // Balance endpoints
                    '/v1/evm/balances?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&network=mainnet',
                    '/v1/svm/balances?owner=GXYBNgyYKbSLr938VJCpmGLCUaAHWsncTi7jDoQSdFR9&network=solana',

                    // Transfer endpoints
                    '/v1/evm/transfers?network=mainnet',
                    '/v1/evm/transfers?network=solana',

                    // Token endpoints
                    '/v1/evm/tokens?contract=0xc944e90c64b2c07662a292be6244bdf05cda44a7&network=mainnet',
                    '/v1/evm/holders?contract=0xc944e90c64b2c07662a292be6244bdf05cda44a7&network=mainnet',

                    // Pool endpoints
                    '/v1/evm/pools?network=mainnet',
                    '/v1/svm/pools?network=solana',

                    // Swap endpoints
                    '/v1/evm/swaps?network=mainnet',
                    '/v1/svm/swaps?network=solana',

                    // OHLC endpoints
                    '/v1/evm/pools/ohlc?pool=0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640&network=mainnet',
                    '/v1/evm/prices/ohlc?contract=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&network=mainnet',

                    // Historical endpoints
                    '/v1/evm/balances/historical?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&network=mainnet',
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

        return {
            status: overallStatus,
            checks: {
                database: dbStatus,
                api_endpoints: apiStatus,
            },
            request_time: new Date(startTime).toISOString().replace('T', ' ').substring(0, 19),
            duration_ms: Date.now() - startTime,
        };
    }
}

export const monitorService = new MonitorService();
