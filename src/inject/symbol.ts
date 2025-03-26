import { ApiErrorResponse, ApiUsageResponse } from "../types/zod.js";

interface Symbol {
    address?: string;
    contract?: string;
    symbol: string;
    decimals: number;
    name: string;
}
const symbols = new Map<string, Symbol>([
    ['0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', { symbol: 'MKR', decimals: 18, name: "Maker" }], // 32bytes
    ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', { symbol: 'USDC', decimals: 6, name: "USD Coin" }], // update name via initializeV2
    ['0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0', { symbol: 'EOS', decimals: 18, name: "EOS: Old Token" }], // 32bytes
    ['0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359', { symbol: 'SAI', decimals: 18, name: "Sai Stablecoin v1.0" }], // 32bytes
    ['0xb31c219959e06f9afbeb36b388a4bad13e802725', { symbol: 'ONOT', decimals: 18, name: "ONOT" }], // 32bytes
    ['0x0000000000a39bb272e79075ade125fd351887ac', { symbol: 'Blur Pool', decimals: 18, name: "Blur Pool" }], // no symbol
    ['0x3597bfd533a99c9aa083587b074434e61eb0a258', { symbol: 'DENT', decimals: 8, name: "DENT" }], // update name after contract creation via setTokenInformation
    ['0xef68e7c694f40c8202821edf525de3782458639f', { symbol: 'LRC', decimals: 18, name: "LoopringCoin" }], // field called `NAME` & `SYMBOL` & `DECIMALS` in contract
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
