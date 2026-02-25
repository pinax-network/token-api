#!/usr/bin/env bun
/**
 * Stablecoin coverage test for Token API.
 *
 * Reads stablecoins data and checks which stablecoins exist on networks
 * we support in dbs-config vs. chains we don't index.
 *
 * Usage:
 *   bun scripts/test-stablecoins.ts                          # full report
 *   bun scripts/test-stablecoins.ts --network mainnet         # filter by network
 *   bun scripts/test-stablecoins.ts --min-balance 100000000   # min $100M market cap
 *   bun scripts/test-stablecoins.ts --config path/to/dbs.yaml # custom config
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

// ─── Platform name → Token API network ID (from dbs-config) ───
const PLATFORM_TO_NETWORK: Record<string, string> = {
    // Direct matches
    ethereum: 'mainnet',
    tron: 'tron',
    solana: 'solana',
    // EVM L1s
    'binance-smart-chain': 'bsc',
    'polygon-pos': 'matic',
    avalanche: 'avalanche',
    fantom: 'fantom',
    cronos: 'cronos',
    celo: 'celo',
    xdai: 'gnosis',
    kava: 'kava',
    moonbeam: 'moonbeam',
    moonriver: 'moonriver',
    harmony: 'harmony',
    aurora: 'aurora',
    // EVM L2s
    'arbitrum-one': 'arbitrum-one',
    'optimistic-ethereum': 'optimism',
    base: 'base',
    linea: 'linea',
    scroll: 'scroll',
    zksync: 'zksync-era',
    blast: 'blast-mainnet',
    mantle: 'mantle',
    mode: 'mode-mainnet',
    'manta-pacific': 'manta-pacific-mainnet',
    boba: 'boba',
    'metis-andromeda': 'metis',
    'polygon-zkevm': 'polygon-zkevm',
    'arbitrum-nova': 'arbitrum-nova',
    fraxtal: 'fraxtal',
    // New EVM chains
    sonic: 'sonic',
    'sei-v2': 'sei-mainnet',
    berachain: 'berachain',
    hyperevm: 'hyperevm',
    'world-chain': 'worldchain',
    unichain: 'unichain',
    'x-layer': 'xlayer',
    plasma: 'plasma',
    monad: 'monad',
    'klay-token': 'kaia',
    ink: 'ink',
    katana: 'katana',
    'flare-network': 'flare',
    starknet: 'starknet',
    'plume-network': 'plume',
};

// ─── Types ───
interface StablecoinEntry {
    id: string;
    symbol: string;
    name: string;
    market_cap: number;
    contracts: { chain: string; address: string }[];
}

interface NormalizedToken {
    symbol: string;
    name: string;
    network: string;
    rawChain: string;
    address: string;
    value: number; // market_cap or balance
}

// ─── Load dbs-config networks ───
function loadNetworks(configPath: string): Set<string> {
    if (!existsSync(configPath)) {
        console.error(`dbs-config not found at ${configPath}`);
        process.exit(1);
    }
    const raw = parse(readFileSync(configPath, 'utf-8'));
    return new Set(Object.keys(raw.networks || {}));
}

function formatUsd(n: number): string {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n}`;
}

function loadStablecoins(path: string): NormalizedToken[] {
    const data: StablecoinEntry[] = JSON.parse(readFileSync(path, 'utf-8'));
    const tokens: NormalizedToken[] = [];
    for (const coin of data) {
        for (const c of coin.contracts) {
            const network = PLATFORM_TO_NETWORK[c.chain] || c.chain;
            tokens.push({
                symbol: coin.symbol.toUpperCase(),
                name: coin.name,
                network,
                rawChain: c.chain,
                address: c.address,
                value: coin.market_cap,
            });
        }
    }
    return tokens;
}

// ─── Main ───
function main() {
    const args = process.argv.slice(2);
    const filterNetwork = args.includes('--network') ? args[args.indexOf('--network') + 1] : null;
    const minBalance = args.includes('--min-balance') ? parseInt(args[args.indexOf('--min-balance') + 1], 10) : 0;
    const configArg = args.includes('--config') ? args[args.indexOf('--config') + 1] : null;

    // Load stablecoin data
    const path = resolve(import.meta.dir, 'stablecoins.json');
    if (!existsSync(path)) {
        console.error('stablecoins.json not found. Run: bun scripts/fetch-stablecoins.ts');
        process.exit(1);
    }
    let tokens = loadStablecoins(path);

    if (minBalance > 0) {
        tokens = tokens.filter((t) => t.value >= minBalance);
    }

    // Load supported networks
    const configPath =
        configArg || process.env.DBS_CONFIG_PATH || resolve(import.meta.dir, '../dbs-config.yaml.example');
    const supportedNetworks = loadNetworks(configPath);

    console.log(`${tokens.length} token-chain pairs | ${supportedNetworks.size} supported networks`);
    console.log(`Supported: ${[...supportedNetworks].join(', ')}\n`);

    // Classify
    const supported: NormalizedToken[] = [];
    const unsupported: NormalizedToken[] = [];
    for (const t of tokens) {
        if (supportedNetworks.has(t.network)) {
            supported.push(t);
        } else {
            unsupported.push(t);
        }
    }

    // ─── Supported networks ───
    console.log('='.repeat(90));
    console.log('✅ STABLECOINS ON SUPPORTED NETWORKS');
    console.log('='.repeat(90));

    const byNetwork = new Map<string, NormalizedToken[]>();
    for (const t of supported) {
        if (filterNetwork && t.network !== filterNetwork) continue;
        if (!byNetwork.has(t.network)) byNetwork.set(t.network, []);
        byNetwork.get(t.network)?.push(t);
    }

    const sortedNetworks = [...byNetwork.entries()].sort((a, b) => b[1].length - a[1].length);

    let totalSupportedValue = 0;
    for (const [network, toks] of sortedNetworks) {
        console.log(`\n  ${network} (${toks.length} stablecoins):`);
        // Dedupe by address
        const seen = new Set<string>();
        for (const t of toks) {
            const key = t.address.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            totalSupportedValue += t.value;
            console.log(`    ${t.symbol.padEnd(12)} ${t.address.padEnd(48)} ${formatUsd(t.value).padStart(10)}`);
        }
    }

    // ─── Unsupported chains ───
    console.log(`\n${'='.repeat(90)}`);
    console.log('❌ STABLECOINS ON UNSUPPORTED CHAINS');
    console.log('='.repeat(90));

    const byChain = new Map<string, NormalizedToken[]>();
    for (const t of unsupported) {
        const key = t.network;
        if (!byChain.has(key)) byChain.set(key, []);
        byChain.get(key)?.push(t);
    }

    const sortedUnsupported = [...byChain.entries()].sort((a, b) => b[1].length - a[1].length);

    let totalUnsupportedValue = 0;
    for (const [chain, toks] of sortedUnsupported) {
        const uniqueTokens = new Map<string, NormalizedToken>();
        for (const t of toks) {
            const key = t.address.toLowerCase();
            if (!uniqueTokens.has(key)) uniqueTokens.set(key, t);
        }
        console.log(`\n  ${chain} (${uniqueTokens.size} stablecoins):`);
        for (const [, t] of uniqueTokens) {
            totalUnsupportedValue += t.value;
            console.log(`    ${t.symbol.padEnd(12)} ${t.address.padEnd(48)} ${formatUsd(t.value).padStart(10)}`);
        }
    }

    // ─── Summary ───
    const totalValue = totalSupportedValue + totalUnsupportedValue;
    console.log(`\n${'='.repeat(90)}`);
    console.log('📊 SUMMARY');
    console.log('='.repeat(90));
    console.log(`  Supported:   ${supported.length} token-chain pairs across ${byNetwork.size} networks`);
    console.log(`  Unsupported: ${unsupported.length} token-chain pairs across ${byChain.size} chains`);
    if (totalValue > 0) {
        console.log(`  Value coverage: ${((totalSupportedValue / totalValue) * 100).toFixed(1)}%`);
    }

    console.log(`\n  Top unsupported chains by token count:`);
    for (const [chain, toks] of sortedUnsupported.slice(0, 15)) {
        const uniqueCount = new Set(toks.map((t) => t.address.toLowerCase())).size;
        console.log(`    ${chain.padEnd(30)} ${String(uniqueCount).padStart(3)} tokens`);
    }
}

main();
