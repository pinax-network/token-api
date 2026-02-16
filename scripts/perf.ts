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

const evmNetwork = config.defaultEvmNetwork;
const svmNetwork = config.defaultSvmNetwork;
const tvmNetwork = config.defaultTvmNetwork;

// Route definitions with query parameters matching the test suite
const PERF_ROUTES: { path: string; query: string; requires: () => boolean }[] = [
    // EVM Tokens
    {
        path: '/v1/evm/tokens',
        query: `network=${evmNetwork}&contract=${EVM_CONTRACT_USDT_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'balances') && hasDatabase(config, evmNetwork, 'transfers'),
    },
    {
        path: '/v1/evm/tokens/native',
        query: `network=${evmNetwork}`,
        requires: () => hasDatabase(config, evmNetwork, 'balances'),
    },
    // SVM Tokens
    {
        path: '/v1/svm/tokens',
        query: `network=${svmNetwork}&mint=${SVM_MINT_WSOL_EXAMPLE}`,
        requires: () => hasDatabase(config, svmNetwork, 'balances'),
    },
    // TVM Tokens
    {
        path: '/v1/tvm/tokens',
        query: `network=${tvmNetwork}&contract=${TVM_CONTRACT_USDT_EXAMPLE}`,
        requires: () => hasDatabase(config, tvmNetwork, 'transfers'),
    },
    {
        path: '/v1/tvm/tokens/native',
        query: `network=${tvmNetwork}`,
        requires: () => hasDatabase(config, tvmNetwork, 'transfers'),
    },
    // EVM Balances
    {
        path: '/v1/evm/balances',
        query: `network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'balances'),
    },
    {
        path: '/v1/evm/balances/native',
        query: `network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'balances'),
    },
    {
        path: '/v1/evm/balances/historical',
        query: `network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'balances'),
    },
    {
        path: '/v1/evm/balances/historical/native',
        query: `network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'balances'),
    },
    // SVM Balances
    {
        path: '/v1/svm/balances',
        query: `network=${svmNetwork}&owner=${SVM_OWNER_USER_EXAMPLE}`,
        requires: () => hasDatabase(config, svmNetwork, 'balances'),
    },
    {
        path: '/v1/svm/balances/native',
        query: `network=${svmNetwork}&address=${SVM_ADDRESS_OWNER_EXAMPLE}`,
        requires: () => hasDatabase(config, svmNetwork, 'balances'),
    },
    // EVM Transfers
    {
        path: '/v1/evm/transfers',
        query: `network=${evmNetwork}`,
        requires: () => hasDatabase(config, evmNetwork, 'transfers'),
    },
    {
        path: '/v1/evm/transfers/native',
        query: `network=${evmNetwork}`,
        requires: () => hasDatabase(config, evmNetwork, 'transfers'),
    },
    // SVM Transfers
    {
        path: '/v1/svm/transfers',
        query: `network=${svmNetwork}`,
        requires: () => hasDatabase(config, svmNetwork, 'transfers'),
    },
    // TVM Transfers
    {
        path: '/v1/tvm/transfers',
        query: `network=${tvmNetwork}`,
        requires: () => hasDatabase(config, tvmNetwork, 'transfers'),
    },
    {
        path: '/v1/tvm/transfers/native',
        query: `network=${tvmNetwork}`,
        requires: () => hasDatabase(config, tvmNetwork, 'transfers'),
    },
    // EVM Holders
    {
        path: '/v1/evm/holders',
        query: `network=${evmNetwork}&contract=${EVM_CONTRACT_USDT_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'balances'),
    },
    {
        path: '/v1/evm/holders/native',
        query: `network=${evmNetwork}`,
        requires: () => hasDatabase(config, evmNetwork, 'balances'),
    },
    // SVM Holders
    {
        path: '/v1/svm/holders',
        query: `network=${svmNetwork}&mint=${SVM_MINT_WSOL_EXAMPLE}`,
        requires: () => hasDatabase(config, svmNetwork, 'balances'),
    },
    // EVM Swaps
    {
        path: '/v1/evm/swaps',
        query: `network=${evmNetwork}`,
        requires: () => hasDatabase(config, evmNetwork, 'dex'),
    },
    // SVM Swaps
    {
        path: '/v1/svm/swaps',
        query: `network=${svmNetwork}`,
        requires: () => hasDatabase(config, svmNetwork, 'dex'),
    },
    // TVM Swaps
    {
        path: '/v1/tvm/swaps',
        query: `network=${tvmNetwork}`,
        requires: () => hasDatabase(config, tvmNetwork, 'dex'),
    },
    // EVM DEXes
    {
        path: '/v1/evm/dexes',
        query: `network=${evmNetwork}`,
        requires: () => hasDatabase(config, evmNetwork, 'dex'),
    },
    // SVM DEXes
    {
        path: '/v1/svm/dexes',
        query: `network=${svmNetwork}`,
        requires: () => hasDatabase(config, svmNetwork, 'dex'),
    },
    // TVM DEXes
    {
        path: '/v1/tvm/dexes',
        query: `network=${tvmNetwork}`,
        requires: () => hasDatabase(config, tvmNetwork, 'dex'),
    },
    // EVM Pools
    {
        path: '/v1/evm/pools',
        query: `network=${evmNetwork}`,
        requires: () => hasDatabase(config, evmNetwork, 'dex'),
    },
    // SVM Pools
    {
        path: '/v1/svm/pools',
        query: `network=${svmNetwork}`,
        requires: () => hasDatabase(config, svmNetwork, 'dex'),
    },
    // TVM Pools
    {
        path: '/v1/tvm/pools',
        query: `network=${tvmNetwork}`,
        requires: () => hasDatabase(config, tvmNetwork, 'dex'),
    },
    // EVM OHLCV
    {
        path: '/v1/evm/pools/ohlc',
        query: `network=${evmNetwork}&pool=${EVM_POOL_USDC_WETH_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'dex'),
    },
    // SVM OHLCV
    {
        path: '/v1/svm/pools/ohlc',
        query: `network=${svmNetwork}&amm_pool=${SVM_AMM_POOL_PUMP_EXAMPLE}`,
        requires: () => hasDatabase(config, svmNetwork, 'dex') && hasDatabase(config, svmNetwork, 'balances'),
    },
    // TVM OHLCV
    {
        path: '/v1/tvm/pools/ohlc',
        query: `network=${tvmNetwork}&pool=${TVM_POOL_USDT_WTRX_EXAMPLE}`,
        requires: () => hasDatabase(config, tvmNetwork, 'dex'),
    },
    // SVM Owner
    {
        path: '/v1/svm/owner',
        query: `network=${svmNetwork}&account=${SVM_TOKEN_ACCOUNT_PUMP_EXAMPLE}`,
        requires: () => hasDatabase(config, svmNetwork, 'balances'),
    },
    // EVM NFT
    {
        path: '/v1/evm/nft/collections',
        query: `network=${evmNetwork}&contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'contracts') && hasDatabase(config, evmNetwork, 'nft'),
    },
    {
        path: '/v1/evm/nft/holders',
        query: `network=${evmNetwork}&contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'nft'),
    },
    {
        path: '/v1/evm/nft/items',
        query: `network=${evmNetwork}&contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'nft'),
    },
    {
        path: '/v1/evm/nft/ownerships',
        query: `network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`,
        requires: () => hasDatabase(config, evmNetwork, 'nft'),
    },
    {
        path: '/v1/evm/nft/sales',
        query: `network=${evmNetwork}`,
        requires: () => hasDatabase(config, evmNetwork, 'nft'),
    },
    {
        path: '/v1/evm/nft/transfers',
        query: `network=${evmNetwork}`,
        requires: () => hasDatabase(config, evmNetwork, 'nft'),
    },
];

interface PerfResult {
    route: string;
    status: number;
    duration_ms: number;
    rows: number;
}

function getStatusEmoji(status: number, duration_ms: number): string {
    if (status !== 200) return '❌';
    if (duration_ms > 2000) return '❌';
    if (duration_ms > 500) return '⚠️ ';
    return '✅';
}

async function runPerf() {
    const results: PerfResult[] = [];
    const skipped: string[] = [];

    // Find the longest route path for alignment
    const maxPathLen = Math.max(...PERF_ROUTES.map((r) => r.path.length));

    for (const route of PERF_ROUTES) {
        if (!route.requires()) {
            skipped.push(route.path);
            continue;
        }

        const url = route.query ? `${route.path}?${route.query}` : route.path;
        const start = performance.now();
        try {
            const response = await app.request(url, { headers: { 'X-Plan': 'free' } });
            const body = await response.json();
            const duration_ms = Math.round((performance.now() - start) * 100) / 100;
            const rows = Array.isArray(body?.data) ? body.data.length : 0;

            results.push({ route: route.path, status: response.status, duration_ms, rows });
            const emoji = getStatusEmoji(response.status, duration_ms);
            const paddedPath = route.path.padEnd(maxPathLen);
            const paddedTime = `${duration_ms}ms`.padStart(12);
            console.log(`${emoji} ${paddedPath}  ${paddedTime}  (${rows} rows)`);
        } catch (err) {
            const duration_ms = Math.round((performance.now() - start) * 100) / 100;
            results.push({ route: route.path, status: 0, duration_ms, rows: 0 });
            const paddedPath = route.path.padEnd(maxPathLen);
            const paddedTime = `${duration_ms}ms`.padStart(12);
            console.log(`❌ ${paddedPath}  ${paddedTime}  (error: ${err})`);
        }
    }

    // Summary
    console.log('\n--- Summary ---');
    console.log(`Total: ${results.length} routes tested, ${skipped.length} skipped`);

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
            console.log(`  ${r.route} — ${r.duration_ms}ms`);
        }

        console.log('\n🐢 Top 3 Slowest:');
        for (const r of top3Slowest) {
            console.log(`  ${r.route} — ${r.duration_ms}ms`);
        }

        if (failed.length > 0) {
            console.log(`\n❌ Failed routes (${failed.length}):`);
            for (const f of failed) {
                console.log(`  ${f.route} — HTTP ${f.status}`);
            }
        }
    }

    if (skipped.length > 0) {
        console.log(`\nSkipped routes (no DB configured):`);
        for (const s of skipped) {
            console.log(`  ${s}`);
        }
    }
}

runPerf().catch((err) => {
    console.error('Perf test failed:', err);
    process.exit(1);
});
