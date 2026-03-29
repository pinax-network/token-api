import pkg from '../package.json' with { type: 'json' };
import { APP_VERSION, config } from './config.js';
import { getSupportedRoutes } from './supported-routes.js';

export function banner() {
    let text = `

    ████████╗░█████╗░██╗░░██╗███████╗███╗░░██╗  ░█████╗░██████╗░██╗
    ╚══██╔══╝██╔══██╗██║░██╔╝██╔════╝████╗░██║  ██╔══██╗██╔══██╗██║
    ░░░██║░░░██║░░██║█████═╝░█████╗░░██╔██╗██║  ███████║██████╔╝██║
    ░░░██║░░░██║░░██║██╔═██╗░██╔══╝░░██║╚████║  ██╔══██║██╔═══╝░██║
    ░░░██║░░░╚█████╔╝██║░╚██╗███████╗██║░╚███║  ██║░░██║██║░░░░░██║
    ░░░╚═╝░░░░╚════╝░╚═╝░░╚═╝╚══════╝╚═╝░░╚══╝  ╚═╝░░╚═╝╚═╝░░░░░╚═╝
`;
    text += `                 Token API v${APP_VERSION}\n`;
    text += `               ${pkg.homepage}\n`;

    return text;
}

console.log(banner());

// Log server init details
export function logServerInit() {
    // Clusters
    const clusterEntries = Object.entries(config.clusters);
    if (clusterEntries.length > 0) {
        console.log('Clusters:');
        for (const [name, cluster] of clusterEntries) {
            console.log(`  ${name}: ${cluster.url}`);
        }
    }

    // Networks grouped by type
    const networkTypes = [
        { label: 'EVM', networks: config.evmNetworks },
        { label: 'SVM', networks: config.svmNetworks },
        { label: 'TVM', networks: config.tvmNetworks },
    ];
    console.log('Networks:');
    for (const { label, networks } of networkTypes) {
        if (networks.length > 0) {
            console.log(`  ${label}: ${networks.join(', ')}`);
        }
    }

    // Database mappings per network
    const dbTypes = [
        { label: 'accounts', mapping: config.accountsDatabases },
        { label: 'balances', mapping: config.balancesDatabases },
        { label: 'transfers', mapping: config.transfersDatabases },
        { label: 'metadata', mapping: config.metadataDatabases },
        { label: 'nfts', mapping: config.nftDatabases },
        { label: 'dexes', mapping: config.dexDatabases },
        { label: 'contracts', mapping: config.contractDatabases },
        { label: 'staking', mapping: config.stakingDatabases },
    ];
    console.log('Databases:');
    for (const networkId of config.networks) {
        const dbs: string[] = [];
        for (const { label, mapping } of dbTypes) {
            if (mapping[networkId]) {
                dbs.push(`${label}=${mapping[networkId].database}`);
            }
        }
        if (dbs.length > 0) {
            console.log(`  ${networkId}: ${dbs.join(', ')}`);
        }
    }

    // Cache settings
    if (config.cacheDisable) {
        console.log('Cache: disabled');
    } else {
        console.log(
            `Cache: default=1s, extended: s-maxage=${config.cacheServerMaxAge}, max-age=${config.cacheMaxAge}, stale-while-revalidate=${config.cacheStaleWhileRevalidate}`
        );
    }

    // Supported & unsupported API routes based on configured databases
    const { supported, unsupported } = getSupportedRoutes(config);
    console.log(`Supported Routes (${supported.length}):`);
    for (const route of supported) {
        console.log(`  ✓ GET ${route}`);
    }
    if (unsupported.length > 0) {
        console.log(`Unsupported Routes (${unsupported.length}):`);
        for (const route of unsupported) {
            console.log(`  ✗ GET ${route}`);
        }
    }
}
