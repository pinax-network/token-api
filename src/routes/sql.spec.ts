import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';

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
        const { response, body } = await fetchRoute('/v1/evm/tokens');
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
    it('GET /v1/evm/holders/native', async () => {
        const { response, body } = await fetchRoute('/v1/evm/holders/native');
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

    // --- EVM NFT ---
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
