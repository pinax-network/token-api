import { Hono } from 'hono';
import { config } from '../src/config.js';
import routes from '../src/routes/index.js';
import { hasDatabase } from '../src/supported-routes.js';
import {
    EVM_ADDRESS_NFT_OFFERER_EXAMPLE,
    EVM_ADDRESS_NFT_RECIPIENT_EXAMPLE,
    EVM_ADDRESS_SWAP_EXAMPLE,
    EVM_ADDRESS_TO_EXAMPLE,
    EVM_ADDRESS_VITALIK_EXAMPLE,
    EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE,
    EVM_CONTRACT_USDT_EXAMPLE,
    EVM_FACTORY_UNISWAP_V3_EXAMPLE,
    EVM_POOL_USDC_WETH_EXAMPLE,
    EVM_TOKEN_ID_PUDGY_PENGUIN_EXAMPLE,
    EVM_TRANSACTION_NFT_SALE_EXAMPLE,
    EVM_TRANSACTION_SWAP_EXAMPLE,
    EVM_TRANSACTION_TRANSFER_EXAMPLE,
    SVM_ADDRESS_OWNER_EXAMPLE,
    SVM_ADDRESS_USER_EXAMPLE,
    SVM_AMM_POOL_PUMP_EXAMPLE,
    SVM_AMM_RAYDIUM_V4_EXAMPLE,
    SVM_MINT_USDC_EXAMPLE,
    SVM_MINT_WSOL_EXAMPLE,
    SVM_OWNER_USER_EXAMPLE,
    SVM_TOKEN_ACCOUNT_PUMP_EXAMPLE,
    SVM_TRANSACTION_SWAP_EXAMPLE,
    SVM_TRANSACTION_TRANSFER_EXAMPLE,
    TVM_ADDRESS_SWAP_EXAMPLE,
    TVM_CONTRACT_USDT_EXAMPLE,
    TVM_FACTORY_SUNSWAP_EXAMPLE,
    TVM_POOL_USDT_WTRX_EXAMPLE,
    TVM_TRANSACTION_SWAP_EXAMPLE,
    TVM_TRANSACTION_TRANSFER_EXAMPLE,
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

// Chain-specific block/time examples for benchmarking
const EVM_BENCH = { startBlock: 21000000, endBlock: 21000005, startTime: 1727592950, endTime: 1727592960 };
const SVM_BENCH = { startBlock: 370000002, endBlock: 370000005, startTime: 1727592950, endTime: 1727592960 };
const TVM_BENCH = { startBlock: 68000000, endBlock: 68000005, startTime: 1727592950, endTime: 1727592960 };

/**
 * Generates 7 filter-combination variants for a route that supports
 * start_block / end_block / start_time / end_time:
 *   1. no filter
 *   2. start_block only
 *   3. end_block only
 *   4. start_block + end_block
 *   5. start_time only
 *   6. end_time only
 *   7. start_time + end_time
 */
function timeBlockVariants(
    path: string,
    chain: ChainType,
    requires: DbCategory[],
    bench: typeof EVM_BENCH,
    extraParams = ''
): PerfRoute[] {
    const p = extraParams ? `${extraParams}&` : '';
    return [
        { path, chain, params: extraParams, requires },
        { path, chain, params: `${p}start_block=${bench.startBlock}`, requires },
        { path, chain, params: `${p}end_block=${bench.endBlock}`, requires },
        { path, chain, params: `${p}start_block=${bench.startBlock}&end_block=${bench.endBlock}`, requires },
        { path, chain, params: `${p}start_time=${bench.startTime}`, requires },
        { path, chain, params: `${p}end_time=${bench.endTime}`, requires },
        { path, chain, params: `${p}start_time=${bench.startTime}&end_time=${bench.endTime}`, requires },
    ];
}

/**
 * Generates variants for a route where each filter param is tested individually.
 * This ensures clamped_start_ts is properly disabled when any filter is active.
 */
function filterVariants(
    path: string,
    chain: ChainType,
    requires: DbCategory[],
    filters: Record<string, string>
): PerfRoute[] {
    return Object.entries(filters).map(([key, value]) => ({
        path,
        chain,
        params: `${key}=${value}`,
        requires,
    }));
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
    ...timeBlockVariants('/v1/evm/transfers', 'evm', ['transfers'], EVM_BENCH),
    ...filterVariants('/v1/evm/transfers', 'evm', ['transfers'], {
        transaction_id: EVM_TRANSACTION_TRANSFER_EXAMPLE,
        contract: EVM_CONTRACT_USDT_EXAMPLE,
        from_address: EVM_ADDRESS_VITALIK_EXAMPLE,
        to_address: EVM_ADDRESS_TO_EXAMPLE,
    }),
    ...timeBlockVariants('/v1/evm/transfers', 'evm', ['transfers'], EVM_BENCH, `contract=${EVM_CONTRACT_USDT_EXAMPLE}`),
    { path: '/v1/evm/transfers/native', chain: 'evm', params: '', requires: ['transfers'] },
    // SVM Transfers
    ...timeBlockVariants('/v1/svm/transfers', 'svm', ['transfers'], SVM_BENCH),
    ...filterVariants('/v1/svm/transfers', 'svm', ['transfers'], {
        signature: SVM_TRANSACTION_TRANSFER_EXAMPLE,
        mint: SVM_MINT_WSOL_EXAMPLE,
        authority: SVM_OWNER_USER_EXAMPLE,
    }),
    ...timeBlockVariants('/v1/svm/transfers', 'svm', ['transfers'], SVM_BENCH, `mint=${SVM_MINT_WSOL_EXAMPLE}`),
    // TVM Transfers
    ...timeBlockVariants('/v1/tvm/transfers', 'tvm', ['transfers'], TVM_BENCH),
    ...filterVariants('/v1/tvm/transfers', 'tvm', ['transfers'], {
        transaction_id: TVM_TRANSACTION_TRANSFER_EXAMPLE,
        contract: TVM_CONTRACT_USDT_EXAMPLE,
        from_address: TVM_ADDRESS_SWAP_EXAMPLE,
    }),
    ...timeBlockVariants('/v1/tvm/transfers', 'tvm', ['transfers'], TVM_BENCH, `contract=${TVM_CONTRACT_USDT_EXAMPLE}`),
    { path: '/v1/tvm/transfers/native', chain: 'tvm', params: '', requires: ['transfers'] },
    // EVM Holders
    { path: '/v1/evm/holders', chain: 'evm', params: `contract=${EVM_CONTRACT_USDT_EXAMPLE}`, requires: ['balances'] },
    { path: '/v1/evm/holders/native', chain: 'evm', params: '', requires: ['balances'] },
    // SVM Holders
    { path: '/v1/svm/holders', chain: 'svm', params: `mint=${SVM_MINT_WSOL_EXAMPLE}`, requires: ['balances'] },
    // EVM Swaps
    ...timeBlockVariants('/v1/evm/swaps', 'evm', ['dex'], EVM_BENCH),
    ...filterVariants('/v1/evm/swaps', 'evm', ['dex'], {
        transaction_id: EVM_TRANSACTION_SWAP_EXAMPLE,
        factory: EVM_FACTORY_UNISWAP_V3_EXAMPLE,
        pool: EVM_POOL_USDC_WETH_EXAMPLE,
        caller: EVM_ADDRESS_SWAP_EXAMPLE,
        sender: EVM_ADDRESS_SWAP_EXAMPLE,
        recipient: EVM_ADDRESS_SWAP_EXAMPLE,
        input_contract: EVM_CONTRACT_USDT_EXAMPLE,
        output_contract: EVM_CONTRACT_USDT_EXAMPLE,
    }),
    ...timeBlockVariants('/v1/evm/swaps', 'evm', ['dex'], EVM_BENCH, `pool=${EVM_POOL_USDC_WETH_EXAMPLE}`),
    // SVM Swaps
    ...timeBlockVariants('/v1/svm/swaps', 'svm', ['dex'], SVM_BENCH),
    ...filterVariants('/v1/svm/swaps', 'svm', ['dex'], {
        signature: SVM_TRANSACTION_SWAP_EXAMPLE,
        amm: SVM_AMM_RAYDIUM_V4_EXAMPLE,
        amm_pool: SVM_AMM_POOL_PUMP_EXAMPLE,
        user: SVM_ADDRESS_USER_EXAMPLE,
        input_mint: SVM_MINT_WSOL_EXAMPLE,
        output_mint: SVM_MINT_USDC_EXAMPLE,
    }),
    ...timeBlockVariants('/v1/svm/swaps', 'svm', ['dex'], SVM_BENCH, `amm_pool=${SVM_AMM_POOL_PUMP_EXAMPLE}`),
    // TVM Swaps
    ...timeBlockVariants('/v1/tvm/swaps', 'tvm', ['dex'], TVM_BENCH),
    ...filterVariants('/v1/tvm/swaps', 'tvm', ['dex'], {
        transaction_id: TVM_TRANSACTION_SWAP_EXAMPLE,
        factory: TVM_FACTORY_SUNSWAP_EXAMPLE,
        pool: TVM_POOL_USDT_WTRX_EXAMPLE,
        caller: TVM_ADDRESS_SWAP_EXAMPLE,
        sender: TVM_ADDRESS_SWAP_EXAMPLE,
        recipient: TVM_ADDRESS_SWAP_EXAMPLE,
        input_contract: TVM_CONTRACT_USDT_EXAMPLE,
        output_contract: TVM_CONTRACT_USDT_EXAMPLE,
    }),
    ...timeBlockVariants('/v1/tvm/swaps', 'tvm', ['dex'], TVM_BENCH, `pool=${TVM_POOL_USDT_WTRX_EXAMPLE}`),
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
    ...timeBlockVariants('/v1/evm/nft/transfers', 'evm', ['nft'], EVM_BENCH),
    ...filterVariants('/v1/evm/nft/transfers', 'evm', ['nft'], {
        type: 'TRANSFER',
        transaction_id: EVM_TRANSACTION_NFT_SALE_EXAMPLE,
        contract: EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE,
        token_id: EVM_TOKEN_ID_PUDGY_PENGUIN_EXAMPLE,
        address: EVM_ADDRESS_NFT_OFFERER_EXAMPLE,
        from_address: EVM_ADDRESS_NFT_OFFERER_EXAMPLE,
        to_address: EVM_ADDRESS_NFT_RECIPIENT_EXAMPLE,
    }),
    ...timeBlockVariants(
        '/v1/evm/nft/transfers',
        'evm',
        ['nft'],
        EVM_BENCH,
        `contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
    ),
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

function parseArgs(argv: string[]): { path?: string; chain?: ChainType; noCache?: boolean } {
    const args = argv.slice(2);
    const result: { path?: string; chain?: ChainType; noCache?: boolean } = {};

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--path' && args[i + 1]) {
            result.path = args[++i];
        } else if (args[i] === '--chain' && args[i + 1]) {
            result.chain = args[++i] as ChainType;
        } else if (args[i] === '--no-cache') {
            result.noCache = true;
        } else if (!args[i]?.startsWith('-')) {
            result.path = args[i];
        }
    }
    return result;
}

async function runPerf() {
    const filters = parseArgs(process.argv);
    const hasFilters = filters.path || filters.chain;

    // Override query cache at runtime
    if (filters.noCache) {
        // biome-ignore lint/suspicious/noExplicitAny: runtime override for benchmarking
        (config as any).disableQueryCache = true;
    }

    const activeRoutes = PERF_ROUTES.filter((r) => {
        if (filters.chain && r.chain !== filters.chain) return false;
        if (filters.path && !r.path.includes(filters.path)) return false;
        return true;
    });

    if (activeRoutes.length === 0) {
        console.log(`No routes matched filters: ${JSON.stringify(filters)}`);
        console.log('\nUsage: bun run scripts/perf.ts [--path <substring>] [--chain <evm|svm|tvm>]');
        console.log('\nExamples:');
        console.log('  bun run scripts/perf.ts --chain evm');
        console.log('  bun run scripts/perf.ts --path swaps');
        console.log('  bun run scripts/perf.ts --path swaps --chain svm');
        console.log('  bun run scripts/perf.ts swaps');
        process.exit(1);
    }

    if (hasFilters || filters.noCache) {
        const parts = [
            filters.path && `path=${filters.path}`,
            filters.chain && `chain=${filters.chain}`,
            filters.noCache && 'cache=off',
        ].filter(Boolean);
        console.log(`Filter: ${parts.join(', ')}  (${activeRoutes.length}/${PERF_ROUTES.length} routes)\n`);
    }

    const results: PerfResult[] = [];
    const skipped: { path: string; network: string }[] = [];

    // Build the list of (route, network) pairs for alignment
    const routeNetworkLabels: { path: string; network: string }[] = [];
    for (const route of activeRoutes) {
        for (const network of getNetworksForChain(route.chain)) {
            routeNetworkLabels.push({ path: route.path, network });
        }
    }
    const maxPathLen = Math.max(
        ...activeRoutes.map((r) => (r.params ? `${r.path}?${r.params}`.length : r.path.length))
    );
    const maxNetworkLen = Math.max(...routeNetworkLabels.map((r) => r.network.length));

    for (const route of activeRoutes) {
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
                const label = route.params ? `${route.path}?${route.params}` : route.path;
                const paddedPath = label.padEnd(maxPathLen);
                const paddedNetwork = `[${network}]`.padEnd(maxNetworkLen + 2);
                const paddedTime = `${duration_ms}ms`.padStart(12);
                console.log(`${emoji} ${paddedPath}  ${paddedNetwork}  ${paddedTime}  (${rows} rows)`);
            } catch (err) {
                const duration_ms = Math.round((performance.now() - start) * 100) / 100;
                results.push({ route: route.path, network, status: 0, duration_ms, rows: 0 });
                const label = route.params ? `${route.path}?${route.params}` : route.path;
                const paddedPath = label.padEnd(maxPathLen);
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
