export interface Symbol {
    symbol: string;
    decimals: number;
    name: string;
}

export const tokens = new Map<string, Symbol>([
    // TO-DO: issue with parsing Wormhole tokens
    // Mainnet
    ['0x3ef389f264e07fff3106a3926f2a166d1393086f', { symbol: 'SAO', decimals: 9, name: "Wormhole: Sator" }], // wormhole uses EIP-1967 Beacon Proxy

    // BSC
    ['0xfa54ff1a158b5189ebba6ae130ced6bbd3aea76e', { symbol: 'SOL', decimals: 9, name: "Wormhole: SOL Token" }], // wormhole uses EIP-1967 Beacon Proxy
    ['0x91ca579b0d47e5cfd5d0862c21d5659d39c8ecf0', { symbol: 'USDC', decimals: 6, name: "Wormhole: USDCso Token" }], // wormhole uses EIP-1967 Beacon Proxy
    ['0xbc7a566b85ef73f935e640a06b5a8b031cd975df', { symbol: 'BLOCK', decimals: 6, name: "Wormhole: Blockasset" }], // wormhole uses EIP-1967 Beacon Proxy
    ['0x49d5cc521f75e13fa8eb4e89e9d381352c897c96', { symbol: 'USDT', decimals: 6, name: "Wormhole: USDTso Token" }], // wormhole uses EIP-1967 Beacon Proxy
    ['0x43274da7818fb8f1d1121d93245ed7c8422ebaf0', { symbol: 'SCT', decimals: 9, name: "Wormhole: SolClout" }], // wormhole uses EIP-1967 Beacon Proxy
    ['0x13b6a55662f6591f8b8408af1c73b017e32eedb8', { symbol: 'RAY', decimals: 9, name: "Wormhole: RAY Token" }], // wormhole uses EIP-1967 Beacon Proxy
])

export const natives = new Map<string, Symbol>([
    ["mainnet", { symbol: 'ETH', decimals: 18, name: "Ethereum" }],
    ["bsc", { symbol: 'BNB', decimals: 18, name: "BNB Smart Chain" }],
    ["base", { symbol: 'ETH', decimals: 18, name: "Ethereum" }],
    ["arbitrum-one", { symbol: 'ETH', decimals: 18, name: "Ethereum" }],
    ["optimism", { symbol: 'ETH', decimals: 18, name: "Optimism" }],
    ["matic", { symbol: 'POL', decimals: 18, name: "Polygon" }],
    ["unichain", { symbol: 'ETH', decimals: 18, name: "Ethereum" }],
    ["solana", { symbol: 'SOL', decimals: 18, name: "Solana" }],
])