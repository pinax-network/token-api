import { describe, expect, it } from 'bun:test';
import { stripUnsupportedTvmSwapFields } from './tvm.js';

describe('TVM swaps response modifiers', () => {
    it('removes caller and call_* fields from the response payload', () => {
        const response = stripUnsupportedTvmSwapFields({
            data: [
                {
                    block_num: 1,
                    datetime: '2026-01-01 00:00:00',
                    timestamp: 1735689600,
                    transaction_id: '0xabc',
                    transaction_index: 7,
                    transaction_from: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
                    call_index: 0,
                    caller: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
                    log_index: 0,
                    log_ordinal: 0,
                    log_block_index: 0,
                    log_topic0: '0xtopic',
                    factory: 'TKWJdrQkqHisa1X8HUdHEfREvTzw4pMAaY',
                    pool: 'TFGDbUyP8xez44C76fin3bn3Ss6jugoUwJ',
                    input_token: { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', symbol: 'USDT', decimals: 6 },
                    output_token: { address: 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR', symbol: 'WTRX', decimals: 6 },
                    sender: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
                    recipient: 'TXF1xDbVGdxFGbovmmmXvBGu8ZiE3Lq4mR',
                    input_amount: '1',
                    input_value: 1,
                    output_amount: '2',
                    output_value: 2,
                    price: 2,
                    price_inv: 0.5,
                    protocol: 'uniswap_v1',
                    summary: 'swap',
                    network: 'tron',
                },
            ],
            statistics: {},
            pagination: { previous_page: 1, current_page: 1 },
            results: 1,
            request_time: '2026-01-01T00:00:00.000Z',
            duration_ms: 1,
        });

        expect(response.data[0]).not.toHaveProperty('caller');
        expect(response.data[0]).not.toHaveProperty('call_index');
        expect(response.data[0]).toHaveProperty('transaction_from');
        expect(response.data[0]).toHaveProperty('sender');
    });
});
