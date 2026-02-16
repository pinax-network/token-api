import pkg from '../package.json' with { type: 'json' };
import { APP_VERSION, config } from './config.js';

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
        { label: 'balances', mapping: config.balancesDatabases },
        { label: 'transfers', mapping: config.transfersDatabases },
        { label: 'nfts', mapping: config.nftDatabases },
        { label: 'dexes', mapping: config.dexDatabases },
        { label: 'contracts', mapping: config.contractDatabases },
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

    // Supported API routes
    console.log('Routes:');
    console.log('  GET /v1/health');
    console.log('  GET /v1/version');
    console.log('  GET /v1/networks');

    const routeGroups = [
        {
            routes: [
                '/v1/evm/tokens',
                '/v1/evm/tokens/native',
                '/v1/evm/balances',
                '/v1/evm/balances/native',
                '/v1/evm/balances/historical',
                '/v1/evm/balances/historical/native',
                '/v1/evm/transfers',
                '/v1/evm/transfers/native',
                '/v1/evm/holders',
                '/v1/evm/holders/native',
                '/v1/evm/swaps',
                '/v1/evm/dexes',
                '/v1/evm/pools',
                '/v1/evm/pools/ohlc',
                '/v1/evm/nft/collections',
                '/v1/evm/nft/holders',
                '/v1/evm/nft/items',
                '/v1/evm/nft/ownerships',
                '/v1/evm/nft/sales',
                '/v1/evm/nft/transfers',
            ],
        },
        {
            routes: [
                '/v1/svm/tokens',
                '/v1/svm/balances',
                '/v1/svm/balances/native',
                '/v1/svm/transfers',
                '/v1/svm/holders',
                '/v1/svm/swaps',
                '/v1/svm/dexes',
                '/v1/svm/pools',
                '/v1/svm/pools/ohlc',
                '/v1/svm/owner',
            ],
        },
        {
            routes: [
                '/v1/tvm/tokens',
                '/v1/tvm/tokens/native',
                '/v1/tvm/transfers',
                '/v1/tvm/transfers/native',
                '/v1/tvm/swaps',
                '/v1/tvm/dexes',
                '/v1/tvm/pools',
                '/v1/tvm/pools/ohlc',
            ],
        },
    ];
    for (const { routes } of routeGroups) {
        for (const route of routes) {
            console.log(`  GET ${route}`);
        }
    }
}

logServerInit();
