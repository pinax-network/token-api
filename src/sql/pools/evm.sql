SELECT
    pools.block_num AS block_num,
    pools.timestamp as datetime,
    transaction_id,
    CAST(factory, 'String') AS factory,
    CAST(pool, 'String') AS pool,
    CAST(token0, 'String') AS token0,
    trim(c0.symbol) as symbol0,
    c0.decimals as decimals0,
    CAST(token1, 'String') AS token1,
    trim(c1.symbol) as symbol1,
    c1.decimals as decimals1,
    fee,
    protocol,
    {network_id: String} as network_id
FROM pools
JOIN contracts c0
    ON pools.token0 = c0.address
JOIN contracts c1
    ON pools.token1 = c1.address
WHERE
    ({pool: String} = '' OR pool = {pool: String})
ORDER BY block_num DESC;