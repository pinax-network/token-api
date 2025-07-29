import * as web3icons from '@web3icons/core';
import type { ApiErrorResponse, ApiUsageResponse } from '../types/zod.js';

type Data = { symbol: string; icon: { web3icon: string } };

export function injectIcons(response: ApiUsageResponse | ApiErrorResponse) {
    if ('data' in response) {
        for (const row of response.data as Data[]) {
            if (!row.symbol) continue;
            // Handle wrapped tokens as well (WETH => ETH, WBNB => BNB, etc)
            const web3icon = findIcon(row.symbol) ?? findIcon(row.symbol.replace(/^W/, ''));
            if (web3icon) {
                row.icon = {
                    web3icon,
                };
            }
        }
    }
}

function findIcon(symbol?: string) {
    if (!symbol) return null;
    for (const token in web3icons.svgs.tokens.mono) {
        if (token === symbol) {
            return token;
        }
    }
    return null;
}
