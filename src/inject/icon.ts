import * as web3icons from "@web3icons/core";
import { ApiErrorResponse, ApiUsageResponse } from "../types/zod.js";

type Data = { symbol: string, icon: { web3icon: string; }; };

export function injectIcons(response: ApiUsageResponse|ApiErrorResponse) {
    if ('data' in response) {
        response.data.forEach((row: Data) => {
            const web3icon = findIcon(row.symbol);
            if (web3icon) {
                row.icon = {
                    web3icon
                };
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