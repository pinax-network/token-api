import client from "../clickhouse/client.js";
import { config, DEFAULT_LOW_LIQUIDITY_CHECK } from "../config.js";
import { ApiErrorResponse, ApiUsageResponse } from "../types/zod.js";
import { stables, natives } from "./prices.tokens.js";

interface Data {
    address?: string;
    contract?: string;
    symbol?: string;
    decimals: number;
    amount: string;
    price_usd?: number; // Current price of token, if available
    low_liquidity?: boolean; // If the size of the pool is less than $10k
    value_usd?: number; // Current value of token owned, if available
    circulating_supply?: number; // Current circulating supply of token, if available
    market_cap?: number; // Market Cap = Current Price x Circulating Supply, if available
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

interface ComputedPrice {
    token: string;
    pair: string;
    price_usd: number;
    liquidity_usd: number;
}

export async function injectPrices(response: ApiUsageResponse|ApiErrorResponse, network_id: string, contract?: string) {
    const database = config.tokenDatabases[network_id];
    const prices = await getPrices(database);

    // Native price
    const native_price = computeNativePrice(prices, network_id);

    if ('data' in response) {
        response.data.forEach((row: Data) => {
            const address = contract ?? row.contract ?? row.address;
            if ( !address || !row.symbol ) return;

            // // Must be native token
            // // Note: Optimism has two native assets `OP` & `WETH`
            // if ( !symbols.natives.get(row.symbol)) {
            //     return;
            // }

            // Token price
            const price = computeTokenPrice(prices, address, native_price);
            if ( !price ) return;
            const {price_usd, liquidity_usd } = price;

            // USD price
            row.price_usd = price_usd;

            // Liquidity check
            if ( liquidity_usd < DEFAULT_LOW_LIQUIDITY_CHECK ) {
                row.low_liquidity = true;
            }

            // Value in USD
            if ( row.amount ) {
                const value = Number(row.amount) / 10 ** row.decimals;
                row.value_usd = value * price_usd;
            }

            // Market Cap
            if ( row.circulating_supply ) {
                row.market_cap = Number(row.circulating_supply) / 10 ** row.decimals * price_usd;
            }
        });
    }
}

async function getPrices(database: string): Promise<Price[]> {
    const query = await Bun.file('./src/inject/prices.sql').text();
    const response = await client({ database }).query({ query, format: "JSONEachRow" });
    return response.json();
}

function computeNativePrice(prices: Price[], network_id: string): ComputedPrice {
    let symbol = '';
    let token = '';
    let reserve_usd = 0;
    let reserve_native = 0;
    for ( const price of prices ) {
        // native -> USD
        if (stables.has(price.token0) && natives.has(price.token1)) {
            symbol = price.symbol1;
            token = price.token1;
            reserve_usd += price.reserve0;
            reserve_native += price.reserve1;
        // USD -> native
        } else if (stables.has(price.token1) && natives.has(price.token0)) {
            symbol = price.symbol0;
            token = price.token0;
            reserve_usd += price.reserve1;
            reserve_native += price.reserve0;
        }
    }
    const price_usd = reserve_usd / reserve_native
    const liquidity_usd = reserve_usd * 2
    const price = {token, pair: `${symbol}USD`, price_usd, liquidity_usd};

    return price;
}

function computeTokenPrice(prices: Price[], token: string, native_price: ComputedPrice): ComputedPrice | null {
    let symbol = '';
    let reserve_usd = 0;
    let reserve_token = 0;

    // override prices for natives
    if (natives.has(token)) return native_price;

    for ( const price of prices ) {
        // USD -> token
        if (stables.has(price.token0) && price.token1 == token) {
            symbol = price.symbol1;
            reserve_usd += price.reserve0;
            reserve_token += price.reserve1;
        // token -> USD
        } else if (stables.has(price.token1) && price.token0 == token) {
            symbol = price.symbol0;
            reserve_usd += price.reserve1;
            reserve_token += price.reserve0;
        // native -> token -> USD
        } else if (natives.has(price.token0) && price.token1 == token) {
            symbol = price.symbol1;
            reserve_usd += price.reserve0 * native_price.price_usd;
            reserve_token += price.reserve1;
        // token -> native -> USD
        } else if (natives.has(price.token1) && price.token0 == token) {
            symbol = price.symbol0;
            reserve_usd += price.reserve1 * native_price.price_usd;
            reserve_token += price.reserve0;
        }
    }
    let price_usd = reserve_usd / reserve_token

    // override prices for stables
    if (stables.has(token)) price_usd = 1.00
    if ( !price_usd ) return null;

    const liquidity_usd = reserve_usd * 2
    const price = {token, pair: `${symbol}USD`, price_usd, liquidity_usd};

    return price;
}