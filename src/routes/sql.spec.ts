import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { config } from '../config.js';
import { hasDatabase } from '../supported-routes.js';
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
    TVM_POOL_USDT_WTRX_EXAMPLE,
} from '../types/examples.js';

const DB_TESTS = !!process.env.DB_TESTS;

const app: Hono = new Hono();

if (DB_TESTS) {
    const routes = await import('./index.js');
    app.route('/', routes.default);
}

// Check which DB categories are connected for each network
const hasEvmBalances = DB_TESTS && hasDatabase(config, config.defaultEvmNetwork, 'balances');
const hasEvmTransfers = DB_TESTS && hasDatabase(config, config.defaultEvmNetwork, 'transfers');
const hasEvmDex = DB_TESTS && hasDatabase(config, config.defaultEvmNetwork, 'dex');
const hasEvmNft = DB_TESTS && hasDatabase(config, config.defaultEvmNetwork, 'nft');
const hasEvmContracts = DB_TESTS && hasDatabase(config, config.defaultEvmNetwork, 'contracts');
const hasSvmBalances = DB_TESTS && hasDatabase(config, config.defaultSvmNetwork, 'balances');
const hasSvmTransfers = DB_TESTS && hasDatabase(config, config.defaultSvmNetwork, 'transfers');
const hasSvmDex = DB_TESTS && hasDatabase(config, config.defaultSvmNetwork, 'dex');
const hasTvmTransfers = DB_TESTS && hasDatabase(config, config.defaultTvmNetwork, 'transfers');
const hasTvmDex = DB_TESTS && hasDatabase(config, config.defaultTvmNetwork, 'dex');

async function fetchRoute(path: string) {
    const response = await app.request(path);
    const body = await response.json();
    return { response, body };
}

describe.skipIf(!DB_TESTS)('SQL queries', () => {
    // --- EVM Tokens ---
    it.skipIf(!hasEvmBalances || !hasEvmTransfers)('GET /v1/evm/tokens', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/tokens?contract=${EVM_CONTRACT_USDT_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmBalances)('GET /v1/evm/tokens/native', async () => {
        const { response, body } = await fetchRoute('/v1/evm/tokens/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Tokens ---
    it.skipIf(!hasSvmBalances)('GET /v1/svm/tokens', async () => {
        const { response, body } = await fetchRoute('/v1/svm/tokens');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM Tokens ---
    it.skipIf(!hasTvmTransfers)('GET /v1/tvm/tokens', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/tokens');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasTvmTransfers)('GET /v1/tvm/tokens/native', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/tokens/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Balances ---
    it.skipIf(!hasEvmBalances)('GET /v1/evm/balances', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/balances?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmBalances)('GET /v1/evm/balances/native', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/balances/native?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmBalances)('GET /v1/evm/balances/historical', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/balances/historical?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmBalances)('GET /v1/evm/balances/historical/native', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/balances/historical/native?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Balances ---
    it.skipIf(!hasSvmBalances)('GET /v1/svm/balances', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/balances?owner=${SVM_OWNER_USER_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasSvmBalances)('GET /v1/svm/balances/native', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/balances/native?address=${SVM_ADDRESS_OWNER_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Transfers ---
    it.skipIf(!hasEvmTransfers)('GET /v1/evm/transfers', async () => {
        const { response, body } = await fetchRoute('/v1/evm/transfers');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmTransfers)('GET /v1/evm/transfers/native', async () => {
        const { response, body } = await fetchRoute('/v1/evm/transfers/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Transfers ---
    it.skipIf(!hasSvmTransfers)('GET /v1/svm/transfers', async () => {
        const { response, body } = await fetchRoute('/v1/svm/transfers');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM Transfers ---
    it.skipIf(!hasTvmTransfers)('GET /v1/tvm/transfers', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/transfers');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasTvmTransfers)('GET /v1/tvm/transfers/native', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/transfers/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Holders ---
    it.skipIf(!hasEvmBalances)('GET /v1/evm/holders', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/holders?contract=${EVM_CONTRACT_USDT_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmBalances)('GET /v1/evm/holders/native', async () => {
        const { response, body } = await fetchRoute('/v1/evm/holders/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Holders ---
    it.skipIf(!hasSvmBalances)('GET /v1/svm/holders', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/holders?mint=${SVM_MINT_WSOL_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Swaps ---
    it.skipIf(!hasEvmDex)('GET /v1/evm/swaps', async () => {
        const { response, body } = await fetchRoute('/v1/evm/swaps');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Swaps ---
    it.skipIf(!hasSvmDex)('GET /v1/svm/swaps', async () => {
        const { response, body } = await fetchRoute('/v1/svm/swaps');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM Swaps ---
    it.skipIf(!hasTvmDex)('GET /v1/tvm/swaps', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/swaps');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM DEXes ---
    it.skipIf(!hasEvmDex)('GET /v1/evm/dexes', async () => {
        const { response, body } = await fetchRoute('/v1/evm/dexes');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM DEXes ---
    it.skipIf(!hasSvmDex)('GET /v1/svm/dexes', async () => {
        const { response, body } = await fetchRoute('/v1/svm/dexes');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM DEXes ---
    it.skipIf(!hasTvmDex)('GET /v1/tvm/dexes', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/dexes');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM Pools ---
    it.skipIf(!hasEvmDex)('GET /v1/evm/pools', async () => {
        const { response, body } = await fetchRoute('/v1/evm/pools');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Pools ---
    it.skipIf(!hasSvmDex)('GET /v1/svm/pools', async () => {
        const { response, body } = await fetchRoute('/v1/svm/pools');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM Pools ---
    it.skipIf(!hasTvmDex)('GET /v1/tvm/pools', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/pools');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM OHLCV ---
    it.skipIf(!hasEvmDex)('GET /v1/evm/pools/ohlc', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/pools/ohlc?pool=${EVM_POOL_USDC_WETH_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM OHLCV ---
    it.skipIf(!hasSvmDex || !hasSvmBalances)('GET /v1/svm/pools/ohlc', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/pools/ohlc?amm_pool=${SVM_AMM_POOL_PUMP_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- TVM OHLCV ---
    it.skipIf(!hasTvmDex)('GET /v1/tvm/pools/ohlc', async () => {
        const { response, body } = await fetchRoute(`/v1/tvm/pools/ohlc?pool=${TVM_POOL_USDT_WTRX_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- SVM Owner ---
    it.skipIf(!hasSvmBalances)('GET /v1/svm/owner', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/owner?account=${SVM_TOKEN_ACCOUNT_PUMP_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    // --- EVM NFT ---
    it.skipIf(!hasEvmContracts || !hasEvmNft)('GET /v1/evm/nft/collections', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/nft/collections?contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmNft)('GET /v1/evm/nft/holders', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/nft/holders?contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmNft)('GET /v1/evm/nft/items', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/nft/items?contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmNft)('GET /v1/evm/nft/ownerships', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/nft/ownerships?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmNft)('GET /v1/evm/nft/sales', async () => {
        const { response, body } = await fetchRoute('/v1/evm/nft/sales');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });

    it.skipIf(!hasEvmNft)('GET /v1/evm/nft/transfers', async () => {
        const { response, body } = await fetchRoute('/v1/evm/nft/transfers');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
        expect(body.data.length).toBeGreaterThan(0);
    });
});
