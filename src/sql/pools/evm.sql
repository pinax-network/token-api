WITH filtered_pools AS (
    SELECT
        block_num,
        timestamp as datetime,
        tx_hash AS transaction_id,
        toString(factory) AS factory,
        pool,
        token0,
        token1,
        fee,
        protocol
    FROM pools
    WHERE
        if ({pool:String} == '', true, pool  = {pool:String}) AND
        if ({factory:String} == '', true, factory = {factory:String}) AND
        if ({token0:String} == '', true, (token0 = {token0:String} OR token1 = {token0:String})) AND
        if ({token1:String} == '', true, (token1 = {token1:String} OR token0 = {token1:String})) AND
        if ({protocol:String} == '', true, protocol = {protocol:String})
)
SELECT
    pools.block_num AS block_num,
    datetime,
    transaction_id,
    factory,
    pool,
    CAST(
        ( toString(token0), trim(c0.symbol), c0.decimals )
        AS Tuple(address String, symbol  String, decimals UInt8)
    ) AS token0,
    CAST(
        ( toString(token1), trim(c1.symbol), c1.decimals )
        AS Tuple(address String, symbol  String, decimals UInt8)
    ) AS token1,
    fee,
    protocol,
    {network_id: String} as network_id
FROM filtered_pools AS pools
JOIN erc20_metadata_initialize AS c0 ON c0.address = pools.token0
JOIN erc20_metadata_initialize AS c1 ON c1.address = pools.token1
WHERE
    isNotNull(c0.symbol) AND isNotNull(c1.symbol) AND
    if ({symbol:String} == '', true, c0.symbol = {symbol:String} OR  c1.symbol = {symbol:String})
ORDER BY datetime DESC
LIMIT   {limit:int}
OFFSET  {offset:int}
