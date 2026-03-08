import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { normalizeProtocolQuery } from './normalizeProtocolQuery.js';

describe('normalizeProtocolQuery', () => {
    it('rewrites hyphenated protocol values before route handling', async () => {
        const app = new Hono();
        app.use('*', normalizeProtocolQuery);
        app.get('/', (c) => c.json({ protocol: c.req.query('protocol'), url: c.req.url }));

        const response = await app.request('http://api.test/?protocol=uniswap-v3');
        const body = await response.json();

        expect(body.protocol).toBe('uniswap_v3');
        expect(body.url).toContain('protocol=uniswap_v3');
    });

    it('leaves underscore protocol values unchanged', async () => {
        const app = new Hono();
        app.use('*', normalizeProtocolQuery);
        app.get('/', (c) => c.json({ protocol: c.req.query('protocol'), url: c.req.url }));

        const response = await app.request('http://api.test/?protocol=uniswap_v3');
        const body = await response.json();

        expect(body.protocol).toBe('uniswap_v3');
        expect(body.url).toContain('protocol=uniswap_v3');
    });

    it('is a no-op when protocol is not provided', async () => {
        const app = new Hono();
        app.use('*', normalizeProtocolQuery);
        app.get('/', (c) => c.json({ protocol: c.req.query('protocol') ?? null, url: c.req.url }));

        const response = await app.request('http://api.test/?limit=10');
        const body = await response.json();

        expect(body.protocol).toBeNull();
        expect(body.url).toContain('limit=10');
    });
});
