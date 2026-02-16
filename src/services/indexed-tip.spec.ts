import { afterEach, describe, expect, it, mock } from 'bun:test';

// Mock the client module before importing the service
const mockQuery = mock(() =>
    Promise.resolve({
        json: () => Promise.resolve([{ block_num: 19876543, timestamp: '2026-02-15 14:03:21' }]),
    })
);

const mockClient = mock(() => ({
    query: mockQuery,
}));

mock.module('../clickhouse/client.js', () => ({
    default: mockClient,
}));

const { getIndexedTip } = await import('./indexed-tip.js');

describe('getIndexedTip', () => {
    afterEach(() => {
        mockQuery.mockClear();
        mockClient.mockClear();
    });

    it('should return null when no config is provided', async () => {
        const result = await getIndexedTip(undefined);
        expect(result).toBeNull();
    });

    it('should return null when config has no network', async () => {
        const result = await getIndexedTip({});
        expect(result).toBeNull();
    });

    it('should return indexed tip for a valid config', async () => {
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 19876543, timestamp: '2026-02-15 14:03:21' }]),
            })
        );

        const result = await getIndexedTip({ network: 'mainnet', database: 'balances' });

        expect(result).not.toBeNull();
        expect(result?.block_num).toBe(19876543);
        expect(result?.block_timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(typeof result?.block_timestamp_unix).toBe('number');
        expect(result?.block_timestamp_unix).toBeGreaterThan(0);
    });

    it('should return null when query returns empty results', async () => {
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([]),
            })
        );

        const result = await getIndexedTip({ network: 'unknown-network', database: 'balances' });
        expect(result).toBeNull();
    });

    it('should return null when block_num is null/zero', async () => {
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 0, timestamp: null }]),
            })
        );

        const result = await getIndexedTip({ network: 'empty-network', database: 'balances' });
        expect(result).toBeNull();
    });

    it('should return null when query throws an error', async () => {
        mockQuery.mockImplementationOnce(() => Promise.reject(new Error('Connection refused')));

        const result = await getIndexedTip({ network: 'failing-network', database: 'balances' });
        expect(result).toBeNull();
    });

    it('should pass config to the client', async () => {
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 100, timestamp: '2026-01-01 00:00:00' }]),
            })
        );

        await getIndexedTip({ network: 'solana', database: 'transfers' });

        expect(mockClient).toHaveBeenCalledWith({ network: 'solana', database: 'transfers' });
    });

    it('should query the blocks table with correct SQL', async () => {
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 100, timestamp: '2026-01-01 00:00:00' }]),
            })
        );

        await getIndexedTip({ network: 'test-network', database: 'dex' });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: 'SELECT max(block_num) as block_num, max(timestamp) as timestamp FROM blocks',
                format: 'JSONEachRow',
            })
        );
    });

    it('should use different cache keys for different databases', async () => {
        // Test that config with network+database is passed correctly
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 200, timestamp: '2026-01-01 00:00:00' }]),
            })
        );

        const result1 = await getIndexedTip({ network: 'testnet', database: 'balances' });
        expect(result1?.block_num).toBe(200);

        // Different database for same network should make a separate call
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 300, timestamp: '2026-01-01 00:00:00' }]),
            })
        );

        const result2 = await getIndexedTip({ network: 'testnet', database: 'transfers' });
        expect(result2?.block_num).toBe(300);
    });
});
