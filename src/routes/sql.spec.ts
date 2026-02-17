import { beforeAll, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
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
} from '../types/examples.js';

const DB_TESTS = !!process.env.DB_TESTS;

let app: Hono;
let hasEvmBalances: boolean;
let hasEvmTransfers: boolean;
let hasEvmDex: boolean;
let hasEvmNft: boolean;
let hasEvmContracts: boolean;
let hasSvmBalances: boolean;
let hasSvmTransfers: boolean;
let hasSvmDex: boolean;
let hasTvmTransfers: boolean;
let hasTvmDex: boolean;
let evmNetwork: string;
let svmNetwork: string;
let tvmNetwork: string;

async function fetchRoute(path: string) {
    const response = await app.request(path, { headers: { 'X-Plan': 'free' } });
    const body = await response.json();
    return { response, body };
}

describe.skipIf(!DB_TESTS)('SQL queries', () => {
    beforeAll(async () => {
        // Lazy-load config and routes to avoid circular dependency issues
        const { config } = await import('../config.js');
        const { hasDatabase } = await import('../supported-routes.js');

        // Bypass plan limits for DB integration tests (config.plans may be mutated by other test files)
        (config as any).plans = null;

        app = new Hono();
        const routes = await import('./index.js');
        app.route('/', routes.default);

        // Check which DB categories are connected for each network
        hasEvmBalances = hasDatabase(config, config.defaultEvmNetwork, 'balances');
        hasEvmTransfers = hasDatabase(config, config.defaultEvmNetwork, 'transfers');
        hasEvmDex = hasDatabase(config, config.defaultEvmNetwork, 'dex');
        hasEvmNft = hasDatabase(config, config.defaultEvmNetwork, 'nft');
        hasEvmContracts = hasDatabase(config, config.defaultEvmNetwork, 'contracts');
        hasSvmBalances = hasDatabase(config, config.defaultSvmNetwork, 'balances');
        hasSvmTransfers = hasDatabase(config, config.defaultSvmNetwork, 'transfers');
        hasSvmDex = hasDatabase(config, config.defaultSvmNetwork, 'dex');
        hasTvmTransfers = hasDatabase(config, config.defaultTvmNetwork, 'transfers');
        hasTvmDex = hasDatabase(config, config.defaultTvmNetwork, 'dex');

        evmNetwork = config.defaultEvmNetwork;
        svmNetwork = config.defaultSvmNetwork;
        tvmNetwork = config.defaultTvmNetwork;
    });

    // --- Monitoring ---
    it('GET /v1/health', async () => {
        const { response, body } = await fetchRoute('/v1/health');
        expect(response.status).toBe(200);
        expect(typeof body).toBe('object');
        // Check that each category contains networks with version and indexed_to
        for (const category of Object.values(body)) {
            for (const network of Object.values(category as Record<string, unknown>)) {
                const entry = network as Record<string, unknown>;
                expect(entry).toHaveProperty('version');
                expect(entry).toHaveProperty('indexed_to');
                const indexedTo = entry.indexed_to as Record<string, unknown>;
                expect(indexedTo).toHaveProperty('block_num');
                expect(indexedTo).toHaveProperty('datetime');
                expect(indexedTo).toHaveProperty('timestamp');
            }
        }
    });

    it('GET /v1/version', async () => {
        const { response, body } = await fetchRoute('/v1/version');
        expect(response.status).toBe(200);
        expect(body).toHaveProperty('version');
        expect(body).toHaveProperty('date');
        expect(body).toHaveProperty('commit');
        expect(typeof body.version).toBe('string');
    });

    it('GET /v1/networks', async () => {
        const { response, body } = await fetchRoute('/v1/networks');
        expect(response.status).toBe(200);
        expect(body).toHaveProperty('networks');
        expect(body.networks).toBeArray();
        expect(body.networks.length).toBeGreaterThan(0);
    });

    // --- EVM Tokens ---
    it('GET /v1/evm/tokens', async () => {
        if (!hasEvmBalances || !hasEvmTransfers) return;
        const { response, body } = await fetchRoute(`/v1/evm/tokens?network=${evmNetwork}&contract=${EVM_CONTRACT_USDT_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/tokens/native', async () => {
        if (!hasEvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/evm/tokens/native?network=${evmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Tokens ---
    it('GET /v1/svm/tokens', async () => {
        if (!hasSvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/svm/tokens?network=${svmNetwork}&mint=${SVM_MINT_WSOL_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM Tokens ---
    it('GET /v1/tvm/tokens', async () => {
        if (!hasTvmTransfers) return;
        const { response, body } = await fetchRoute(`/v1/tvm/tokens?network=${tvmNetwork}&contract=${TVM_CONTRACT_USDT_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/tvm/tokens/native', async () => {
        if (!hasTvmTransfers) return;
        const { response, body } = await fetchRoute(`/v1/tvm/tokens/native?network=${tvmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Balances ---
    it('GET /v1/evm/balances', async () => {
        if (!hasEvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/evm/balances?network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/balances/native', async () => {
        if (!hasEvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/evm/balances/native?network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/balances/historical', async () => {
        if (!hasEvmBalances) return;
        const { response, body } = await fetchRoute(
            `/v1/evm/balances/historical?network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/balances/historical/native', async () => {
        if (!hasEvmBalances) return;
        const { response, body } = await fetchRoute(
            `/v1/evm/balances/historical/native?network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Balances ---
    it('GET /v1/svm/balances', async () => {
        if (!hasSvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/svm/balances?network=${svmNetwork}&owner=${SVM_OWNER_USER_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/svm/balances/native', async () => {
        if (!hasSvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/svm/balances/native?network=${svmNetwork}&address=${SVM_ADDRESS_OWNER_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Transfers ---
    it('GET /v1/evm/transfers', async () => {
        if (!hasEvmTransfers) return;
        const { response, body } = await fetchRoute(`/v1/evm/transfers?network=${evmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/transfers/native', async () => {
        if (!hasEvmTransfers) return;
        const { response, body } = await fetchRoute(`/v1/evm/transfers/native?network=${evmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Transfers ---
    it('GET /v1/svm/transfers', async () => {
        if (!hasSvmTransfers) return;
        const { response, body } = await fetchRoute(`/v1/svm/transfers?network=${svmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM Transfers ---
    it('GET /v1/tvm/transfers', async () => {
        if (!hasTvmTransfers) return;
        const { response, body } = await fetchRoute(`/v1/tvm/transfers?network=${tvmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/tvm/transfers/native', async () => {
        if (!hasTvmTransfers) return;
        const { response, body } = await fetchRoute(`/v1/tvm/transfers/native?network=${tvmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Holders ---
    it('GET /v1/evm/holders', async () => {
        if (!hasEvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/evm/holders?network=${evmNetwork}&contract=${EVM_CONTRACT_USDT_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/holders/native', async () => {
        if (!hasEvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/evm/holders/native?network=${evmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Holders ---
    it('GET /v1/svm/holders', async () => {
        if (!hasSvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/svm/holders?network=${svmNetwork}&mint=${SVM_MINT_WSOL_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Swaps ---
    it('GET /v1/evm/swaps', async () => {
        if (!hasEvmDex) return;
        const { response, body } = await fetchRoute(`/v1/evm/swaps?network=${evmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Swaps ---
    it('GET /v1/svm/swaps', async () => {
        if (!hasSvmDex) return;
        const { response, body } = await fetchRoute(`/v1/svm/swaps?network=${svmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM Swaps ---
    it('GET /v1/tvm/swaps', async () => {
        if (!hasTvmDex) return;
        const { response, body } = await fetchRoute(`/v1/tvm/swaps?network=${tvmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM DEXes ---
    it('GET /v1/evm/dexes', async () => {
        if (!hasEvmDex) return;
        const { response, body } = await fetchRoute(`/v1/evm/dexes?network=${evmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM DEXes ---
    it('GET /v1/svm/dexes', async () => {
        if (!hasSvmDex) return;
        const { response, body } = await fetchRoute(`/v1/svm/dexes?network=${svmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM DEXes ---
    it('GET /v1/tvm/dexes', async () => {
        if (!hasTvmDex) return;
        const { response, body } = await fetchRoute(`/v1/tvm/dexes?network=${tvmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Pools ---
    it('GET /v1/evm/pools', async () => {
        if (!hasEvmDex) return;
        const { response, body } = await fetchRoute(`/v1/evm/pools?network=${evmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Pools ---
    it('GET /v1/svm/pools', async () => {
        if (!hasSvmDex) return;
        const { response, body } = await fetchRoute(`/v1/svm/pools?network=${svmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM Pools ---
    it('GET /v1/tvm/pools', async () => {
        if (!hasTvmDex) return;
        const { response, body } = await fetchRoute(`/v1/tvm/pools?network=${tvmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM OHLCV ---
    it('GET /v1/evm/pools/ohlc', async () => {
        if (!hasEvmDex) return;
        const { response, body } = await fetchRoute(`/v1/evm/pools/ohlc?network=${evmNetwork}&pool=${EVM_POOL_USDC_WETH_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM OHLCV ---
    it('GET /v1/svm/pools/ohlc', async () => {
        if (!hasSvmDex || !hasSvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/svm/pools/ohlc?network=${svmNetwork}&amm_pool=${SVM_AMM_POOL_PUMP_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM OHLCV ---
    it('GET /v1/tvm/pools/ohlc', async () => {
        if (!hasTvmDex) return;
        const { response, body } = await fetchRoute(`/v1/tvm/pools/ohlc?network=${tvmNetwork}&pool=${TVM_POOL_USDT_WTRX_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Owner ---
    it('GET /v1/svm/owner', async () => {
        if (!hasSvmBalances) return;
        const { response, body } = await fetchRoute(`/v1/svm/owner?network=${svmNetwork}&account=${SVM_TOKEN_ACCOUNT_PUMP_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM NFT ---
    it('GET /v1/evm/nft/collections', async () => {
        if (!hasEvmContracts || !hasEvmNft) return;
        const { response, body } = await fetchRoute(
            `/v1/evm/nft/collections?network=${evmNetwork}&contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/nft/holders', async () => {
        if (!hasEvmNft) return;
        const { response, body } = await fetchRoute(
            `/v1/evm/nft/holders?network=${evmNetwork}&contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/nft/items', async () => {
        if (!hasEvmNft) return;
        const { response, body } = await fetchRoute(
            `/v1/evm/nft/items?network=${evmNetwork}&contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/nft/ownerships', async () => {
        if (!hasEvmNft) return;
        const { response, body } = await fetchRoute(`/v1/evm/nft/ownerships?network=${evmNetwork}&address=${EVM_ADDRESS_VITALIK_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/nft/sales', async () => {
        if (!hasEvmNft) return;
        const { response, body } = await fetchRoute(`/v1/evm/nft/sales?network=${evmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /v1/evm/nft/transfers', async () => {
        if (!hasEvmNft) return;
        const { response, body } = await fetchRoute(`/v1/evm/nft/transfers?network=${evmNetwork}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });
});
