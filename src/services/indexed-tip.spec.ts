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

    it('should return null when no network is provided', async () => {
        const result = await getIndexedTip(undefined);
        expect(result).toBeNull();
    });

    it('should return null when network is empty', async () => {
        const result = await getIndexedTip('');
        expect(result).toBeNull();
    });

    it('should return indexed tip for a valid network', async () => {
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 19876543, timestamp: '2026-02-15 14:03:21' }]),
            })
        );

        const result = await getIndexedTip('mainnet');

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

        const result = await getIndexedTip('unknown-network');
        expect(result).toBeNull();
    });

    it('should return null when block_num is null/zero', async () => {
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 0, timestamp: null }]),
            })
        );

        const result = await getIndexedTip('empty-network');
        expect(result).toBeNull();
    });

    it('should return null when query throws an error', async () => {
        mockQuery.mockImplementationOnce(() => Promise.reject(new Error('Connection refused')));

        const result = await getIndexedTip('failing-network');
        expect(result).toBeNull();
    });

    it('should pass network to the client config', async () => {
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 100, timestamp: '2026-01-01 00:00:00' }]),
            })
        );

        await getIndexedTip('solana');

        expect(mockClient).toHaveBeenCalledWith({ network: 'solana' });
    });

    it('should query the blocks table with correct SQL', async () => {
        mockQuery.mockImplementationOnce(() =>
            Promise.resolve({
                json: () => Promise.resolve([{ block_num: 100, timestamp: '2026-01-01 00:00:00' }]),
            })
        );

        await getIndexedTip('test-network');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: 'SELECT max(block_num) as block_num, max(timestamp) as timestamp FROM blocks',
                format: 'JSONEachRow',
            })
        );
    });
});
