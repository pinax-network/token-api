import client from "../clickhouse/client.js";
import { EVM_SUBSTREAMS_VERSION } from "../routes/token/index.js";
import { ApiErrorResponse, ApiUsageResponse } from "../types/zod.js";

interface Data {
    address?: string;
    contract?: string;
    price_usd: number;
    value_usd: number;
}

interface Price {
    token0: string;
    token1: string;
    symbol0: string;
    symbol1: string;
    reserve0: number;
    reserve1: number;
    price0: number;
    price1: number;
}

export async function injectPrices(response: ApiUsageResponse|ApiErrorResponse, network_id: string) {
    const database = `${network_id}:${EVM_SUBSTREAMS_VERSION}`;
    const prices = await getPrices(database);
    const nativeValue = computeNativeValue(prices);

    if ('data' in response) {
        response.data.forEach((row: Data) => {

        });
    }
}

async function getPrices(database: string): Promise<Price[]> {
    const query = await Bun.file('./src/inject/prices.sql').text();
    const response = await client({ database }).query({ query, format: "JSONEachRow" });
    return response.json();
}

const stables = new Set(['USDC', 'USDT', 'DAI']);
const natives = new Set(['WETH']);

function computeNativeValue(prices: Price[]) {
    let symbol = '';
    let reserve0 = 0; // native
    let reserve1 = 0; // stables
    for ( const price of prices ) {
        if (natives.has(price.symbol0) && stables.has(price.symbol1)) {
            symbol = price.symbol0;
            reserve0 += price.reserve0;
            reserve1 += price.reserve1;
        } else if (natives.has(price.symbol1) && stables.has(price.symbol0)) {
            symbol = price.symbol1;
            reserve0 += price.reserve1;
            reserve1 += price.reserve0;
        }
    }
    const price_usd = Number((reserve1 / reserve0).toFixed(2));
    const liquidity_usd = Number((reserve1 * 2).toFixed(0));
    return {pair: `${symbol}USD`, price_usd, liquidity_usd};
}
