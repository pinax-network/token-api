SELECT
    pairs_created.token0 AS token0,
    pairs_created.token1 AS token1,
    c0.symbol AS symbol0,
    c1.symbol AS symbol1,
    toUInt256(reserve0) / pow(10, c0.decimals) AS reserve0,
    toUInt256(reserve1) / pow(10, c1.decimals) AS reserve1,
    (reserve0 / reserve1) AS price0,
    (reserve1 / reserve0) AS price1
FROM syncs FINAL
JOIN pairs_created
    ON pairs_created.pair = syncs.address
JOIN contracts c0
    ON c0.address = pairs_created.token0
JOIN contracts c1
    ON c1.address = pairs_created.token1
WHERE
    syncs.date > Date('2025-01-01') AND
    if (symbol0 in ('WETH'), reserve0 > 0.05, true) AND -- $100 worth of Native
    if (symbol1 in ('WETH'), reserve1 > 0.05, true) AND -- $100 worth of Native
    if (symbol0 in ('USDC', 'USDT', 'DAI'), reserve0 > 100.0, true) AND -- $100 worth of Stable
    if (symbol1 in ('USDC', 'USDT', 'DAI'), reserve1 > 100.0, true) AND -- $100 worth of Stable
    (
        pairs_created.token0 IN (
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', -- Mainnet: WETH
            '0xdac17f958d2ee523a2206206994597c13d831ec7', -- Mainnet: USDT
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', -- Mainnet: USDC
            '0x6b175474e89094c44da98b954eedeac495271d0f' -- Mainnet: DAI
        ) OR
        pairs_created.token1 IN (
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', -- Mainnet: WETH
            '0xdac17f958d2ee523a2206206994597c13d831ec7', -- Mainnet: USDT
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', -- Mainnet: USDC
            '0x6b175474e89094c44da98b954eedeac495271d0f' -- Mainnet: DAI
        )
    ) AND
    factory IN (
        '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', -- Mainnet: Uniswap V2
        '0xf164fc0ec4e93095b804a4795bbe1e041497b92a', -- Mainnet: Uniswap V2
        '0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f', -- Mainnet: Uniswap V2
        '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', -- Mainnet: SushiSwap V2
        '0x03f7724180aa6b939894b5ca4314783b0b36b329', -- Mainnet: Shiba Inu V2
        '0xeff92a263d31888d860bd50809a8d171709b7b1c' -- Mainnet: PancakeSwap V2
    )
ORDER BY token0, reserve0 DESC