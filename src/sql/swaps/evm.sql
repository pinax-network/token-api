SELECT
    swaps.block_num as block_num,
    swaps.timestamp as datetime,
    swaps.transaction_id as transaction_id,
    swaps.caller as caller,
    swaps.pool as pool,
    pools.factory as factory,
    CAST(
        ( toString(pools.token0), trim(c0.symbol), c0.decimals )
        AS Tuple(address String, symbol  String, decimals UInt8)
    ) AS token0,
    CAST(
        ( toString(pools.token1), trim(c1.symbol), c1.decimals )
        AS Tuple(address String, symbol  String, decimals UInt8)
    ) AS token1,
    sender,
    recipient,
    toString(amount0) as amount0,
    toString(amount1) as amount1,
    swaps.amount0 / pow(10, c0.decimals) as value0,
    swaps.amount1 / pow(10, c1.decimals) as value1,
    price,
    pools.fee as fee,
    pools.protocol as protocol,
    {network_id: String} as network_id
FROM swaps
JOIN pools ON pools.pool = swaps.pool
JOIN contracts c0 ON c0.address = pools.token0
JOIN contracts c1 ON c1.address = pools.token1
WHERE
    isNotNull(c0.symbol) AND isNotNull(c1.symbol) AND isNotNull(c0.decimals) AND isNotNull(c1.decimals)
    AND if ({transaction_id:String} == '', true, swaps.transaction_id = {transaction_id:String})
    AND if ({caller:String}         == '', true, swaps.caller         = {caller:String})
    AND if ({sender:String}         == '', true, swaps.sender         = {sender:String})
    AND if ({recipient:String}      == '', true, swaps.recipient      = {recipient:String})
    AND if ({pool:String}           == '', true, swaps.pool           = {pool:String})
    AND if ({factory:String}        == '', true, pools.factory        = {factory:String})
    AND if ({token:String}          == '', true, token0.address       = {token:String} OR token1.address = {token:String})
    AND if ({symbol:String}         == '', true, token0.symbol        = {symbol:String} OR token1.symbol = {symbol:String})
    AND if ({protocol:String}       == '', true, swaps.protocol       = {protocol:String})