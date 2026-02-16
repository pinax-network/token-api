import { Hono } from 'hono';
import { config } from '../src/config.js';
import routes from '../src/routes/index.js';
import { hasDatabase } from '../src/supported-routes.js';
import {
    EVM_ADDRESS_VITALIK_EXAMPLE,
    EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE,
    EVM_CONTRACT_USDT_EXAMPLE,
    EVM_POOL_USDC_WETH_EXAMPLE,
    SVM_ADDRESS_OWNER_EXAMPLE,
    SVM_AMM_POOL_PUMP_EXAMPLE,
    SVM_MINT_WSOL_EXAMPLE,
    SVM_OWNER_USER_EXAMPLE,
    SVM_TOKEN_ACCOUNT_PUMP_EXAMPLE,
    TVM_CONTRACT_USDT_EXAMPLE,
    TVM_POOL_USDT_WTRX_EXAMPLE,
} from '../src/types/examples.js';

const app = new Hono();
app.route('/', routes);

type DbCategory = 'balances' | 'transfers' | 'dex' | 'nft' | 'contracts';
type ChainType = 'evm' | 'svm' | 'tvm';

interface PerfRoute {
    path: string;
    chain: ChainType;
    params: string;
    requires: DbCategory[];
}

// Route definitions with query parameters (excluding network) matching the test suite
const PERF_ROUTES: PerfRoute[] = [
    // EVM Tokens
    {
        path: '/v1/evm/tokens',
        chain: 'evm',
        params: `contract=${EVM_CONTRACT_USDT_EXAMPLE}`,
        requires: ['balances', 'transfers'],
    },
    { path: '/v1/evm/tokens/native', chain: 'evm', params: '', requires: ['balances'] },
    // SVM Tokens
    { path: '/v1/svm/tokens', chain: 'svm', params: `mint=${SVM_MINT_WSOL_EXAMPLE}`, requires: ['balances'] },
    // TVM Tokens
    { path: '/v1/tvm/tokens', chain: 'tvm', params: `contract=${TVM_CONTRACT_USDT_EXAMPLE}`, requires: ['transfers'] },
    { path: '/v1/tvm/tokens/native', chain: 'tvm', params: '', requires: ['transfers'] },
    // EVM Balances
    {
        path: '/v1/evm/balances',
        chain: 'evm',
        params: `address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: ['balances'],
    },
    {
        path: '/v1/evm/balances/native',
        chain: 'evm',
        params: `address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: ['balances'],
    },
    {
        path: '/v1/evm/balances/historical',
        chain: 'evm',
        params: `address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: ['balances'],
    },
    {
        path: '/v1/evm/balances/historical/native',
        chain: 'evm',
        params: `address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: ['balances'],
    },
    // SVM Balances
    { path: '/v1/svm/balances', chain: 'svm', params: `owner=${SVM_OWNER_USER_EXAMPLE}`, requires: ['balances'] },
    {
        path: '/v1/svm/balances/native',
        chain: 'svm',
        params: `address=${SVM_ADDRESS_OWNER_EXAMPLE}`,
        requires: ['balances'],
    },
    // EVM Transfers
    { path: '/v1/evm/transfers', chain: 'evm', params: '', requires: ['transfers'] },
    { path: '/v1/evm/transfers/native', chain: 'evm', params: '', requires: ['transfers'] },
    // SVM Transfers
    { path: '/v1/svm/transfers', chain: 'svm', params: '', requires: ['transfers'] },
    // TVM Transfers
    { path: '/v1/tvm/transfers', chain: 'tvm', params: '', requires: ['transfers'] },
    { path: '/v1/tvm/transfers/native', chain: 'tvm', params: '', requires: ['transfers'] },
    // EVM Holders
    { path: '/v1/evm/holders', chain: 'evm', params: `contract=${EVM_CONTRACT_USDT_EXAMPLE}`, requires: ['balances'] },
    { path: '/v1/evm/holders/native', chain: 'evm', params: '', requires: ['balances'] },
    // SVM Holders
    { path: '/v1/svm/holders', chain: 'svm', params: `mint=${SVM_MINT_WSOL_EXAMPLE}`, requires: ['balances'] },
    // EVM Swaps
    { path: '/v1/evm/swaps', chain: 'evm', params: '', requires: ['dex'] },
    // SVM Swaps
    { path: '/v1/svm/swaps', chain: 'svm', params: '', requires: ['dex'] },
    // TVM Swaps
    { path: '/v1/tvm/swaps', chain: 'tvm', params: '', requires: ['dex'] },
    // EVM DEXes
    { path: '/v1/evm/dexes', chain: 'evm', params: '', requires: ['dex'] },
    // SVM DEXes
    { path: '/v1/svm/dexes', chain: 'svm', params: '', requires: ['dex'] },
    // TVM DEXes
    { path: '/v1/tvm/dexes', chain: 'tvm', params: '', requires: ['dex'] },
    // EVM Pools
    { path: '/v1/evm/pools', chain: 'evm', params: '', requires: ['dex'] },
    // SVM Pools
    { path: '/v1/svm/pools', chain: 'svm', params: '', requires: ['dex'] },
    // TVM Pools
    { path: '/v1/tvm/pools', chain: 'tvm', params: '', requires: ['dex'] },
    // EVM OHLCV
    { path: '/v1/evm/pools/ohlc', chain: 'evm', params: `pool=${EVM_POOL_USDC_WETH_EXAMPLE}`, requires: ['dex'] },
    // SVM OHLCV
    {
        path: '/v1/svm/pools/ohlc',
        chain: 'svm',
        params: `amm_pool=${SVM_AMM_POOL_PUMP_EXAMPLE}`,
        requires: ['dex', 'balances'],
    },
    // TVM OHLCV
    { path: '/v1/tvm/pools/ohlc', chain: 'tvm', params: `pool=${TVM_POOL_USDT_WTRX_EXAMPLE}`, requires: ['dex'] },
    // SVM Owner
    {
        path: '/v1/svm/owner',
        chain: 'svm',
        params: `account=${SVM_TOKEN_ACCOUNT_PUMP_EXAMPLE}`,
        requires: ['balances'],
    },
    // EVM NFT
    {
        path: '/v1/evm/nft/collections',
        chain: 'evm',
        params: `contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`,
        requires: ['contracts', 'nft'],
    },
    {
        path: '/v1/evm/nft/holders',
        chain: 'evm',
        params: `contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`,
        requires: ['nft'],
    },
    {
        path: '/v1/evm/nft/items',
        chain: 'evm',
        params: `contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`,
        requires: ['nft'],
    },
    {
        path: '/v1/evm/nft/ownerships',
        chain: 'evm',
        params: `address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: ['nft'],
    },
    { path: '/v1/evm/nft/sales', chain: 'evm', params: '', requires: ['nft'] },
    { path: '/v1/evm/nft/transfers', chain: 'evm', params: '', requires: ['nft'] },
];

function getNetworksForChain(chain: ChainType): string[] {
    switch (chain) {
        case 'evm':
            return config.evmNetworks;
        case 'svm':
            return config.svmNetworks;
        case 'tvm':
            return config.tvmNetworks;
        default:
            throw new Error(`Unknown chain type: ${chain}`);
    }
}

interface PerfResult {
    route: string;
    network: string;
    status: number;
    duration_ms: number;
    rows: number;
}

function getStatusEmoji(status: number, duration_ms: number, rows: number): string {
    if (status !== 200) return '❌';
    if (duration_ms > 2000) return '❌';
    if (rows === 0) return '💀';
    if (duration_ms > 500) return '⚠️ ';
    return '✅';
}

async function runPerf() {
    const results: PerfResult[] = [];
    const skipped: { path: string; network: string }[] = [];

    // Build the list of (route, network) pairs for alignment
    const routeNetworkLabels: { path: string; network: string }[] = [];
    for (const route of PERF_ROUTES) {
        for (const network of getNetworksForChain(route.chain)) {
            routeNetworkLabels.push({ path: route.path, network });
        }
    }
    const maxPathLen = Math.max(...routeNetworkLabels.map((r) => r.path.length));
    const maxNetworkLen = Math.max(...routeNetworkLabels.map((r) => r.network.length));

    for (const route of PERF_ROUTES) {
        const networks = getNetworksForChain(route.chain);

        for (const network of networks) {
            const hasAllDbs = route.requires.every((category) => hasDatabase(config, network, category));
            if (!hasAllDbs) {
                skipped.push({ path: route.path, network });
                continue;
            }

            const query = route.params ? `network=${network}&${route.params}` : `network=${network}`;
            const url = `${route.path}?${query}`;
            const start = performance.now();
            try {
                const response = await app.request(url, { headers: { 'X-Plan': 'free', 'Cache-Control': 'no-cache' } });
                const body = await response.json();
                const duration_ms = Math.round((performance.now() - start) * 100) / 100;
                const rows = Array.isArray(body?.data) ? body.data.length : 0;

                results.push({ route: route.path, network, status: response.status, duration_ms, rows });
                const emoji = getStatusEmoji(response.status, duration_ms, rows);
                const paddedPath = route.path.padEnd(maxPathLen);
                const paddedNetwork = `[${network}]`.padEnd(maxNetworkLen + 2);
                const paddedTime = `${duration_ms}ms`.padStart(12);
                console.log(`${emoji} ${paddedPath}  ${paddedNetwork}  ${paddedTime}  (${rows} rows)`);
            } catch (err) {
                const duration_ms = Math.round((performance.now() - start) * 100) / 100;
                results.push({ route: route.path, network, status: 0, duration_ms, rows: 0 });
                const paddedPath = route.path.padEnd(maxPathLen);
                const paddedNetwork = `[${network}]`.padEnd(maxNetworkLen + 2);
                const paddedTime = `${duration_ms}ms`.padStart(12);
                console.log(`❌ ${paddedPath}  ${paddedNetwork}  ${paddedTime}  (error: ${err})`);
            }
        }
    }

    // Summary
    console.log('\n--- Summary ---');
    console.log(`Total: ${results.length} queries tested, ${skipped.length} skipped`);

    if (results.length > 0) {
        const totalTime = results.reduce((sum, r) => sum + r.duration_ms, 0);
        const avgTime = Math.round((totalTime / results.length) * 100) / 100;
        const failed = results.filter((r) => r.status !== 200);

        console.log(`Total time: ${Math.round(totalTime * 100) / 100}ms`);
        console.log(`Average: ${avgTime}ms`);

        // Top 3 fastest & slowest
        const sorted = [...results].sort((a, b) => a.duration_ms - b.duration_ms);
        const top3Fastest = sorted.slice(0, 3);
        const top3Slowest = sorted.slice(-3).reverse();

        console.log('\n🏎️  Top 3 Fastest:');
        for (const r of top3Fastest) {
            console.log(`  ${r.route} [${r.network}] — ${r.duration_ms}ms`);
        }

        console.log('\n🐢 Top 3 Slowest:');
        for (const r of top3Slowest) {
            console.log(`  ${r.route} [${r.network}] — ${r.duration_ms}ms`);
        }

        if (failed.length > 0) {
            console.log(`\n❌ Failed queries (${failed.length}):`);
            for (const f of failed) {
                console.log(`  ${f.route} [${f.network}] — HTTP ${f.status}`);
            }
        }

        const dead = results.filter((r) => r.status === 200 && r.rows === 0);
        if (dead.length > 0) {
            console.log(`\n💀 No rows returned (${dead.length}):`);
            for (const d of dead) {
                console.log(`  ${d.route} [${d.network}] — ${d.duration_ms}ms`);
            }
        }
    }

    if (skipped.length > 0) {
        console.log(`\nSkipped queries (no DB configured):`);
        for (const s of skipped) {
            console.log(`  ${s.path} [${s.network}]`);
        }
    }
}

runPerf().catch((err) => {
    console.error('Perf test failed:', err);
    process.exit(1);
});
