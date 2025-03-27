export const stables = new Set([
    // Mainnet
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // Mainnet: USDT (Tether USD)
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Mainnet: USDC (Circle: USDC Token)
    '0x6b175474e89094c44da98b954eedeac495271d0f', // Mainnet: DAI (Sky: Dai Stablecoin)
    '0xc5f0f7b66764f6ec8c8dff7ba683102295e16409', // Mainnet: FDUSD (First Digital USD)
    '0x0000000000085d4780b73119b644ae5ecd22b376', // Mainnet: TUSD (TrueUSD)
    '0x8e870d67f660d95d5be530380d0ec0bd388289e1', // Mainnet: USDP (Pax Dollar)

    // BSC
    '0x55d398326f99059ff775485246999027b3197955', // BSC: USDT (Binance-Peg Tether USD)
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // BSC: USDC (Binance-Peg USDC Token)
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', // BSC: DAI (Binance-Peg Dai Stablecoin)
    '0xe9e7cea3dedca5984780bafc599bd69add087d56', // BSC: BUSD (Binance-Peg BUSD Token)

    // Base
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // Base: USDC (Circle: USDC Token)
    '0x820c137fa70c8691f0e44dc420a5e53c168921dc', // Base: USDS (Sky: Dai Stablecoin)
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // Base: DAI (Sky: Dai Stablecoin)

    // Arbitrum One
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // Arbitrum: USDT (Tether USD)
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // Arbitrum: USDC (Circle: USDC Token)
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // Arbitrum: USDC.e (Bridged from Ethereum)
    '0x6491c05a82219b8d1479057361ff1654749b876b', // Arbitrum: USDS (Sky: Dai Stablecoin)
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // Arbitrum: DAI (Sky: Dai Stablecoin)

    // Optimism
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // Optimism: USDT (Tether USD)
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // Optimism: UDSC (Bridged via Circle CCTP)
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // Optimism: USDC.e (Bridged from Ethereum)
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // Optimism: DAI (Sky: Dai Stablecoin)
]);

export const natives = new Set([
    // Native
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',

    // Mainnet
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // Mainnet: WETH

    // BSC
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', // BSC: WBNB

    // Base
    '0x4200000000000000000000000000000000000006', // Base: WETH

    // Arbitrum One
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // Arbitrum: WETH

    // Optimism
    '0x4200000000000000000000000000000000000006', // Optimism: WETH
    // '0x4200000000000000000000000000000000000042', // Optimism: OP
]);