#!/usr/bin/env bun
/**
 * Fetch ALL stablecoin contracts from CoinGecko and save to JSON.
 *
 * Strategy:
 * 1. GET /coins/list?include_platform=true → all coins with platform addresses (single call)
 * 2. GET /coins/markets?category=stablecoins → paginated list of stablecoin IDs + market caps
 * 3. Cross-reference to get stablecoin contracts per chain
 *
 * Usage: bun scripts/fetch-stablecoins.ts
 */

const API_KEY = process.env.COINGECKO_API_KEY;
if (!API_KEY) {
    console.error('Error: COINGECKO_API_KEY environment variable is required.');
    process.exit(1);
}
const BASE = 'https://api.coingecko.com/api/v3';
const HEADERS = { 'x-cg-demo-api-key': API_KEY };
const PER_PAGE = 250;
const RATE_LIMIT_MS = 6500; // CoinGecko demo: ~10 calls/min

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON<T>(url: string, retries = 2): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url, { headers: HEADERS });
        if (res.status === 429 && attempt < retries) {
            console.log(`  Rate limited, waiting 30s... (attempt ${attempt + 1})`);
            await sleep(30000);
            continue;
        }
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`${res.status}: ${body.slice(0, 200)}`);
        }
        return res.json() as Promise<T>;
    }
    throw new Error('Max retries exceeded');
}

interface CoinListEntry {
    id: string;
    symbol: string;
    name: string;
    platforms: Record<string, string>;
}

interface CoinMarket {
    id: string;
    symbol: string;
    name: string;
    market_cap: number | null;
}

interface StablecoinOutput {
    id: string;
    symbol: string;
    name: string;
    market_cap: number;
    contracts: { chain: string; address: string }[];
}

async function main() {
    // Step 1: Fetch full coins list with platforms (single API call)
    console.log('Fetching full coins list with platforms...');
    const allCoins = await fetchJSON<CoinListEntry[]>(`${BASE}/coins/list?include_platform=true`);
    console.log(`  Total coins in CoinGecko: ${allCoins.length}`);

    // Build lookup: id → platforms
    const platformsById = new Map<string, Record<string, string>>();
    for (const coin of allCoins) {
        if (coin.platforms && Object.keys(coin.platforms).length > 0) {
            platformsById.set(coin.id, coin.platforms);
        }
    }

    await sleep(RATE_LIMIT_MS);

    // Step 2: Fetch stablecoin market data (paginated)
    console.log('Fetching stablecoin market data...');
    const stablecoinMarkets: CoinMarket[] = [];
    for (let page = 1; page <= 5; page++) {
        const url = `${BASE}/coins/markets?vs_currency=usd&category=stablecoins&order=market_cap_desc&per_page=${PER_PAGE}&page=${page}`;
        const coins = await fetchJSON<CoinMarket[]>(url);
        if (!coins.length) break;
        stablecoinMarkets.push(...coins);
        console.log(`  Page ${page}: ${coins.length} coins`);
        if (coins.length < PER_PAGE) break;
        await sleep(RATE_LIMIT_MS);
    }
    console.log(`  Total stablecoins: ${stablecoinMarkets.length}`);

    // Step 3: Cross-reference to build output
    const results: StablecoinOutput[] = [];
    let withContracts = 0;
    let withoutContracts = 0;

    for (const market of stablecoinMarkets) {
        const platforms = platformsById.get(market.id);
        const contracts: { chain: string; address: string }[] = [];

        if (platforms) {
            for (const [chain, address] of Object.entries(platforms)) {
                if (address?.trim()) {
                    contracts.push({ chain, address: address.trim() });
                }
            }
        }

        if (contracts.length > 0) {
            withContracts++;
        } else {
            withoutContracts++;
        }

        results.push({
            id: market.id,
            symbol: market.symbol,
            name: market.name,
            market_cap: market.market_cap ?? 0,
            contracts,
        });
    }

    // Write output
    const outPath = new URL('./stablecoins.json', import.meta.url).pathname;
    await Bun.write(outPath, JSON.stringify(results, null, 2));

    console.log(`\nWrote ${results.length} stablecoins to ${outPath}`);
    console.log(`  With contracts: ${withContracts}`);
    console.log(`  Without contracts: ${withoutContracts}`);

    // Quick summary of unique chains
    const chainCounts = new Map<string, number>();
    for (const r of results) {
        for (const c of r.contracts) {
            chainCounts.set(c.chain, (chainCounts.get(c.chain) || 0) + 1);
        }
    }
    const sorted = [...chainCounts.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`\nUnique chains (${sorted.length}):`);
    for (const [chain, count] of sorted) {
        console.log(`  ${chain.padEnd(35)} ${count} tokens`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
