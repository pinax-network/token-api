SELECT
    pools.block_num AS block_num,
    pools.timestamp as datetime,
    transaction_id,
    CAST(factory, 'String') AS factory,
    CAST(
        ( CAST(pool AS String), trim(p.symbol), p.decimals )
        AS Tuple(address String, symbol  String, decimals UInt8)
    ) AS pool,
    CAST(
        ( CAST(token0 AS String), trim(c0.symbol), c0.decimals )
        AS Tuple(address String, symbol  String, decimals UInt8)
    ) AS token0,
    CAST(
        ( CAST(token1 AS String), trim(c1.symbol), c1.decimals )
        AS Tuple(address String, symbol  String, decimals UInt8)
    ) AS token1,
    fee,
    protocol,
    {network_id: String} as network_id
FROM pools
JOIN contracts c0
    ON pools.token0 = c0.address
JOIN contracts c1
    ON pools.token1 = c1.address
JOIN contracts p
    ON pools.pool = p.address
WHERE
    ({pool: String} = '' OR pool = {pool: String})
ORDER BY block_num DESC;