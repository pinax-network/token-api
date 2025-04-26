WITH s AS (
    SELECT
        block_num,
        timestamp,
        transaction_id,
        caller,
        pool,
        sender,
        recipient,
        amount0,
        amount1,
        price,
        protocol
    FROM    swaps
    WHERE   timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
        AND ({transaction_id:String} = '' OR transaction_id = {transaction_id:String})
        AND ({caller:String}     = '' OR caller         = {caller:String})
        AND ({sender:String}     = '' OR sender         = {sender:String})
        AND ({recipient:String}  = '' OR recipient      = {recipient:String})
        AND ({pool:String}       = '' OR pool           = {pool:String})
        AND ({protocol:String}   = '' OR protocol       = {protocol:String})
    ORDER BY timestamp DESC
    LIMIT   {limit:int}
    OFFSET  {offset:int}
)
SELECT
    s.block_num         AS block_num,
    s.timestamp         AS datetime,
    toUnixTimestamp(s.timestamp) as timestamp,
    s.transaction_id    AS transaction_id,
    s.caller            AS caller,
    s.pool              AS pool,
    p.factory           AS factory,
    CAST(( pools.token0, if(isNull(c0.symbol), '', c0.symbol), c0.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token0,
    CAST(( pools.token1, if(isNull(c1.symbol), '', c1.symbol), c1.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token1,
    s.sender,
    s.recipient,
    toString(s.amount0) as amount0,
    toString(s.amount1) as amount1,
    s.amount0 / pow(10, c0.decimals) AS value0,
    s.amount1 / pow(10, c1.decimals) AS value1,
    s.price   / pow(10, c1.decimals - c0.decimals) AS price0,
    1.0 / price0 AS price1,
    s.protocol as protocol,
    {network_id:String} as network_id
FROM s
JOIN pools      AS p ON p.pool = s.pool
    AND ({pool:String}       = '' OR p.pool           = {pool:String})
    AND ({protocol:String}   = '' OR p.protocol       = {protocol:String})
JOIN contracts  AS c0 ON c0.address = p.token0
JOIN contracts  AS c1 ON c1.address = p.token1
