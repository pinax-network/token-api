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
JOIN contracts AS c0 ON c0.address = pools.token0
JOIN contracts AS c1 ON c1.address = pools.token1
JOIN contracts AS p  ON p.address  = pools.pool
WHERE
    if ({pool:String} == '', true, pools.pool  = {pool:String}) AND
    if ({factory:String} == '', true, pools.factory = {factory:String}) AND
    if ({token:String} == '', true, pools.token0 = {token:String} OR  pools.token1 = {token:String}) AND
    if ({symbol:String} == '', true, c0.symbol = {symbol:String} OR  c1.symbol = {symbol:String})
ORDER BY block_num DESC;