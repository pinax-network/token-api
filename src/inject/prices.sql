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
    if (symbol0 in ('WETH', 'WBNB'), reserve0 > 0.05, true) AND -- $100 worth of Native
    if (symbol1 in ('WETH', 'WBNB'), reserve1 > 0.05, true) AND -- $100 worth of Native
    if (symbol0 in ('USDC', 'USDT', 'DAI', 'FDUSD', 'TUSD', 'USDP'), reserve0 > 100.0, true) AND -- $100 worth of Stable
    if (symbol1 in ('USDC', 'USDT', 'DAI', 'FDUSD', 'TUSD', 'USDP'), reserve1 > 100.0, true) -- $100 worth of Stable
ORDER BY token0, reserve0 DESC