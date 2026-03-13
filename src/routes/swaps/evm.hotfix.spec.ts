import { describe, expect, it } from 'bun:test';
import { applyTemporaryEvmUniswapV3SwapHotfix } from './evm.hotfix.js';

describe('temporary EVM Uniswap V3 swap hotfix', () => {
    it('inverts affected Uniswap V3 rows and rebuilds the summary from corrected values', () => {
        const response = applyTemporaryEvmUniswapV3SwapHotfix({
            data: [
                {
                    block_num: 23590326,
                    datetime: '2025-10-16 12:48:47',
                    timestamp: 1760618927,
                    transaction_id: '0xf6374799c227c9db38ff5ac1d5bebe8b607a1de1238cd861ebd1053ec07305ca',
                    factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
                    pool: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
                    input_token: {
                        address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                        symbol: 'WETH',
                        decimals: 18,
                    },
                    output_token: {
                        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                        symbol: 'USDC',
                        decimals: 6,
                    },
                    caller: '0xa69babef1ca67a37ffaf7a485dfff3382056e78c',
                    sender: '0xa69babef1ca67a37ffaf7a485dfff3382056e78c',
                    recipient: '0xa69babef1ca67a37ffaf7a485dfff3382056e78c',
                    input_amount: '10042247631260591234',
                    input_value: 10.042247631260592,
                    output_amount: '40735537734',
                    output_value: 40735.537734,
                    price: 4.0565074163667475e-9,
                    price_inv: 246517483.4798306,
                    protocol: 'uniswap_v3',
                    summary: 'upstream summary is currently reversed',
                    network: 'mainnet',
                },
            ],
            statistics: {},
            pagination: {
                previous_page: 1,
                current_page: 1,
            },
            results: 1,
            request_time: '2026-03-13T00:00:00.000Z',
            duration_ms: 1,
        });

        expect('status' in response).toBe(false);
        if ('status' in response) {
            return;
        }

        expect(response.data).toEqual([
            {
                block_num: 23590326,
                datetime: '2025-10-16 12:48:47',
                timestamp: 1760618927,
                transaction_id: '0xf6374799c227c9db38ff5ac1d5bebe8b607a1de1238cd861ebd1053ec07305ca',
                factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
                pool: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
                input_token: {
                    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                    symbol: 'USDC',
                    decimals: 6,
                },
                output_token: {
                    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                    symbol: 'WETH',
                    decimals: 18,
                },
                caller: '0xa69babef1ca67a37ffaf7a485dfff3382056e78c',
                sender: '0xa69babef1ca67a37ffaf7a485dfff3382056e78c',
                recipient: '0xa69babef1ca67a37ffaf7a485dfff3382056e78c',
                input_amount: '40735537734',
                input_value: 40735.537734,
                output_amount: '10042247631260591234',
                output_value: 10.042247631260592,
                price: 246517483.4798306,
                price_inv: 4.0565074163667475e-9,
                protocol: 'uniswap_v3',
                summary: 'Swap 40.74 thousand USDC for 10.042247631260592 WETH on Uniswap V3',
                network: 'mainnet',
            },
        ]);
    });

    it('leaves non-Uniswap V3 rows untouched', () => {
        const response = applyTemporaryEvmUniswapV3SwapHotfix({
            data: [
                {
                    input_token: {
                        address: '0xa',
                        symbol: 'AAA',
                        decimals: 18,
                    },
                    output_token: {
                        address: '0xb',
                        symbol: 'BBB',
                        decimals: 6,
                    },
                    input_amount: '1',
                    output_amount: '2',
                    input_value: 1,
                    output_value: 2,
                    price: 2,
                    price_inv: 0.5,
                    protocol: 'uniswap_v2',
                    summary: 'Swap 1 AAA for 2 BBB on Uniswap V2',
                },
            ],
            statistics: {},
            pagination: {
                previous_page: 1,
                current_page: 1,
            },
            results: 1,
            request_time: '2026-03-13T00:00:00.000Z',
            duration_ms: 1,
        });

        expect(response).toEqual({
            data: [
                {
                    input_token: {
                        address: '0xa',
                        symbol: 'AAA',
                        decimals: 18,
                    },
                    output_token: {
                        address: '0xb',
                        symbol: 'BBB',
                        decimals: 6,
                    },
                    input_amount: '1',
                    output_amount: '2',
                    input_value: 1,
                    output_value: 2,
                    price: 2,
                    price_inv: 0.5,
                    protocol: 'uniswap_v2',
                    summary: 'Swap 1 AAA for 2 BBB on Uniswap V2',
                },
            ],
            statistics: {},
            pagination: {
                previous_page: 1,
                current_page: 1,
            },
            results: 1,
            request_time: '2026-03-13T00:00:00.000Z',
            duration_ms: 1,
        });
    });
});
