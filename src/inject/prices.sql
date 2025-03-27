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
    syncs.date > Date('2025-01-01') AND -- only syncs after 2025
    (symbol0 in ('WBNB', 'WETH', 'USDC', 'USDT', 'DAI', 'BUSD', 'USDS') OR symbol1 in ('WBNB', 'WETH', 'USDC', 'USDT', 'DAI', 'BUSD', 'USDS')) AND
    if (symbol0 in ('WBNB', 'WETH'), reserve0 > 0.05, true) AND -- $100 worth of Native
    if (symbol1 in ('WBNB', 'WETH'), reserve1 > 0.05, true) AND -- $100 worth of Native
    if (symbol0 in ('USDC', 'USDT', 'DAI', 'BUSD', 'USDS'), reserve0 > 100.0, true) AND -- $100 worth of Stable
    if (symbol1 in ('USDC', 'USDT', 'DAI', 'BUSD', 'USDS'), reserve1 > 100.0, true) AND -- $100 worth of Stable
    toUInt256(syncs.reserve0) > 1000000 AND toUInt256(syncs.reserve0) > 1000000 -- remove dust pools
ORDER BY token0, reserve0 DESC
-- SETTINGS use_query_cache = true, query_cache_min_query_duration = 5000;