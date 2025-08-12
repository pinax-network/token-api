import type { ApiErrorResponse, ApiUsageResponse } from '../types/zod.js';
import { natives, type Symbol as TokenSymbol, tokens } from './symbol.tokens.js';

export interface Data extends TokenSymbol {
    address?: string;
    contract?: string;
}

export function injectSymbol(response: ApiUsageResponse | ApiErrorResponse, network_id: string, include_name = false) {
    if ('data' in response && Array.isArray(response.data)) {
        for (const row of response.data as Data[]) {
            const address = row.address || row.contract;
            if (!address) continue;

            // inject native symbol
            if (address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                const symbol = natives.get(network_id);
                if (symbol) {
                    row.symbol = symbol.symbol;
                    row.decimals = symbol.decimals;
                    if (include_name) row.name = symbol.name;
                }
            }
            // inject token symbol
            const tokenInfo = tokens.get(address);
            if (tokenInfo) {
                row.symbol = tokenInfo.symbol;
                row.decimals = tokenInfo.decimals;
                if (include_name) row.name = tokenInfo.name;
            }
        }
    }
}
