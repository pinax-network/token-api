import { describe, expect, it } from 'bun:test';
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
    TVM_POOL_USDT_WTRX_EXAMPLE,
} from '../types/examples.js';

const DB_TESTS = !!process.env.DB_TESTS;

const app: Hono = new Hono();

if (DB_TESTS) {
    const routes = await import('./index.js');
    app.route('/', routes.default);
}

async function fetchRoute(path: string) {
    const response = await app.request(path);
    const body = await response.json();
    return { response, body };
}

describe.skipIf(!DB_TESTS)('SQL queries', () => {
    // --- EVM Tokens ---
    it('GET /v1/evm/tokens', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/tokens?contract=${EVM_CONTRACT_USDT_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/tokens/native', async () => {
        const { response, body } = await fetchRoute('/v1/evm/tokens/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- SVM Tokens ---
    it('GET /v1/svm/tokens', async () => {
        const { response, body } = await fetchRoute('/v1/svm/tokens');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- TVM Tokens ---
    it('GET /v1/tvm/tokens', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/tokens');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/tvm/tokens/native', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/tokens/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- EVM Balances ---
    it('GET /v1/evm/balances', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/balances?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/balances/native', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/balances/native?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/balances/historical', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/balances/historical?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/balances/historical/native', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/balances/historical/native?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- SVM Balances ---
    it('GET /v1/svm/balances', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/balances?owner=${SVM_OWNER_USER_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/svm/balances/native', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/balances/native?address=${SVM_ADDRESS_OWNER_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- EVM Transfers ---
    it('GET /v1/evm/transfers', async () => {
        const { response, body } = await fetchRoute('/v1/evm/transfers');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/transfers/native', async () => {
        const { response, body } = await fetchRoute('/v1/evm/transfers/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- SVM Transfers ---
    it('GET /v1/svm/transfers', async () => {
        const { response, body } = await fetchRoute('/v1/svm/transfers');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- TVM Transfers ---
    it('GET /v1/tvm/transfers', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/transfers');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/tvm/transfers/native', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/transfers/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- EVM Holders ---
    it('GET /v1/evm/holders', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/holders?contract=${EVM_CONTRACT_USDT_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/holders/native', async () => {
        const { response, body } = await fetchRoute('/v1/evm/holders/native');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- SVM Holders ---
    it('GET /v1/svm/holders', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/holders?mint=${SVM_MINT_WSOL_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- EVM Swaps ---
    it('GET /v1/evm/swaps', async () => {
        const { response, body } = await fetchRoute('/v1/evm/swaps');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- SVM Swaps ---
    it('GET /v1/svm/swaps', async () => {
        const { response, body } = await fetchRoute('/v1/svm/swaps');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- TVM Swaps ---
    it('GET /v1/tvm/swaps', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/swaps');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- EVM DEXes ---
    it('GET /v1/evm/dexes', async () => {
        const { response, body } = await fetchRoute('/v1/evm/dexes');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- SVM DEXes ---
    it('GET /v1/svm/dexes', async () => {
        const { response, body } = await fetchRoute('/v1/svm/dexes');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- TVM DEXes ---
    it('GET /v1/tvm/dexes', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/dexes');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- EVM Pools ---
    it('GET /v1/evm/pools', async () => {
        const { response, body } = await fetchRoute('/v1/evm/pools');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- SVM Pools ---
    it('GET /v1/svm/pools', async () => {
        const { response, body } = await fetchRoute('/v1/svm/pools');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- TVM Pools ---
    it('GET /v1/tvm/pools', async () => {
        const { response, body } = await fetchRoute('/v1/tvm/pools');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- EVM OHLCV ---
    it('GET /v1/evm/pools/ohlc', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/pools/ohlc?pool=${EVM_POOL_USDC_WETH_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- SVM OHLCV ---
    it('GET /v1/svm/pools/ohlc', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/pools/ohlc?amm_pool=${SVM_AMM_POOL_PUMP_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- TVM OHLCV ---
    it('GET /v1/tvm/pools/ohlc', async () => {
        const { response, body } = await fetchRoute(`/v1/tvm/pools/ohlc?pool=${TVM_POOL_USDT_WTRX_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- SVM Owner ---
    it('GET /v1/svm/owner', async () => {
        const { response, body } = await fetchRoute(`/v1/svm/owner?account=${SVM_TOKEN_ACCOUNT_PUMP_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    // --- EVM NFT ---
    it('GET /v1/evm/nft/collections', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/nft/collections?contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/nft/holders', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/nft/holders?contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/nft/items', async () => {
        const { response, body } = await fetchRoute(
            `/v1/evm/nft/items?contract=${EVM_CONTRACT_PUDGY_PENGUINS_EXAMPLE}`
        );
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/nft/ownerships', async () => {
        const { response, body } = await fetchRoute(`/v1/evm/nft/ownerships?address=${EVM_ADDRESS_VITALIK_EXAMPLE}`);
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/nft/sales', async () => {
        const { response, body } = await fetchRoute('/v1/evm/nft/sales');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });

    it('GET /v1/evm/nft/transfers', async () => {
        const { response, body } = await fetchRoute('/v1/evm/nft/transfers');
        expect(response.status).toBe(200);
        expect(body.data).toBeArray();
    });
});
