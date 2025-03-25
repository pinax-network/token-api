import * as web3icons from "@web3icons/core";
import { ApiErrorResponse, ApiUsageResponse } from "../types/zod.js";

interface Symbol {
    address?: string;
    contract?: string;
    symbol: string;
    decimals: number;
    name: string;
}
const symbols = new Map<string, Symbol>([
    ['0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', { symbol: 'MKR', decimals: 18, name: "Maker" }],
    ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', { symbol: 'USDC', decimals: 6, name: "USD Coin" }],
])

export function injectSymbol(response: ApiUsageResponse|ApiErrorResponse) {
    if ('data' in response) {
        response.data.forEach((row: Symbol) => {
            const address = row.address || row.contract;
            if (address) {
                const symbol = symbols.get(address);
                if (symbol) {
                    row.symbol = symbol.symbol;
                    row.decimals = symbol.decimals;
                    row.name = symbol.name;
                }
            }
        });
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