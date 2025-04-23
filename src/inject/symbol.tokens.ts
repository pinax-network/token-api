export interface Symbol {
    symbol: string;
    decimals: number;
    name: string;
}

export const tokens = new Map<string, Symbol>([
    // Mainnet
    // ['0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', { symbol: 'MKR', decimals: 18, name: "Maker" }], // 32bytes
    // ['0xd31a59c85ae9d8edefec411d448f90841571b89c', { symbol: 'SOL', decimals: 9, name: "Wormhole: SOL Token" }],
    // ['0xc059a531b4234d05e9ef4ac51028f7e6156e2cce', { symbol: 'sMEME', decimals: 18, name: "Staked Memecoin" }], // has no symbol
    // ['0x84018071282d4b2996272659d9c01cb08dd7327f', { symbol: 'BLENDR', decimals: 18, name: "Blendr Network" }], // uses `launch` method to set name + symbol

    // ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', { symbol: 'USDC', decimals: 6, name: "USD Coin" }], // update name via initializeV2
    // ['0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0', { symbol: 'EOS', decimals: 18, name: "EOS: Old Token" }], // 32bytes
    // ['0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359', { symbol: 'SAI', decimals: 18, name: "Sai Stablecoin v1.0" }], // 32bytes
    // ['0xb31c219959e06f9afbeb36b388a4bad13e802725', { symbol: 'ONOT', decimals: 18, name: "ONOT" }], // 32bytes
    // ['0x0000000000a39bb272e79075ade125fd351887ac', { symbol: 'Blur Pool', decimals: 18, name: "Blur Pool" }], // no symbol
    // ['0x3597bfd533a99c9aa083587b074434e61eb0a258', { symbol: 'DENT', decimals: 8, name: "DENT" }], // update name after contract creation via setTokenInformation
    // ['0xef68e7c694f40c8202821edf525de3782458639f', { symbol: 'LRC', decimals: 18, name: "LoopringCoin" }], // field called `NAME` & `SYMBOL` & `DECIMALS` in contract
    // ['0x0000000000085d4780b73119b644ae5ecd22b376', { symbol: 'TUSD', decimals: 18, name: "TrueUSD" }], // unknown reason ??

    // Base
    // ['0x4200000000000000000000000000000000000006', { symbol: 'WETH', decimals: 18, name: "Wrapped Ether" }], // genesis
    // ['0xec3d2537a03fc4d790aa1fc66fa7dfadc6b245fb', { symbol: 'WARS', decimals: 18, name: "WARS by wow.ai" }], // uses `setMetatada` method
    // ['0x6b9bb36519538e0c073894e964e90172e1c0b41f', { symbol: 'WEWE', decimals: 18, name: "WEWECOIN" }], // uses `setNameAndTicker` method

    // Optimism
    // ['0x4200000000000000000000000000000000000042', { symbol: 'OP', decimals: 18, name: "Optimism" }], // genesis
    // ['0x4200000000000000000000000000000000000006', { symbol: 'WETH', decimals: 18, name: "Wrapped Ether" }], // genesis

    // // Polygon
    // ['0xb447aafc36b85e4e1267ec43e6a945ff1edf0555', { symbol: 'MFS', decimals: 18, name: "Forcecoin" }], // uses `setName` & `setSymbol`

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
])