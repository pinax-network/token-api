import type { ApiErrorResponse, ApiUsageResponse } from '../types/zod.js';
import { type Symbol, natives, tokens } from './symbol.tokens.js';

export interface Data extends Symbol {
    address?: string;
    contract?: string;
}

export function injectSymbol(response: ApiUsageResponse | ApiErrorResponse, network_id: string, include_name = false) {
    if ('data' in response) {
        response.data.forEach((row: Data) => {
            const address = row.address || row.contract;
            if (!address) return;

            // inject native symbol
            if (address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                const symbol = natives.get(network_id);
                if (symbol) {
                    row.symbol = symbol.symbol;
                    row.decimals = symbol.decimals;
                    if (include_name) row.name = symbol.name;
                }
                return;
            }
            // inject token symbol
            const symbol = tokens.get(address);
            if (symbol) {
                row.symbol = symbol.symbol;
                row.decimals = symbol.decimals;
                if (include_name) row.name = symbol.name;
            }
        });
    }
}
