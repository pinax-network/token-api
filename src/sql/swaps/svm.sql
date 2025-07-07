WITH s AS (
    SELECT
        block_num,
        timestamp,
        signature,
        program_id,
        pool,
        sender,
        token0,
        amount0,
        token1,
        amount1,
        price,
        protocol
    FROM swaps
    WHERE timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
        AND ({transaction_id:String} = '' OR signature = {transaction_id:String})
        AND ({sender:String}     = '' OR sender         = {sender:String})
        AND ({pool:String}       = '' OR pool           = {pool:String})
        AND ({protocol:String}   = '' OR protocol       = {protocol:String})
    ORDER BY timestamp DESC
    LIMIT   {limit:int}
    OFFSET  {offset:int}
),
p AS (
    SELECT
        s.block_num AS block_num,
        s.timestamp AS timestamp,
        signature,
        s.program_id AS program_id,
        pool,
        sender,
        CAST(( s.token0, 'TO IMPLEMENT', c0.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token0,
        c0.decimals AS decimals0,
        amount0,
        CAST(( s.token1, 'TO IMPLEMENT', c1.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token1,
        c1.decimals AS decimals1,
        amount1,
        price,
        protocol
    FROM s
    JOIN mints AS c0 ON c0.mint = s.token0
    JOIN mints AS c1 ON c1.mint = s.token1
)
SELECT
    block_num,
    p.timestamp AS datetime,
    toUnixTimestamp(timestamp) AS timestamp,
    signature AS transaction_id,
    pool AS pool,
    token0,
    token1,
    sender,
    toString(amount0) AS amount0,
    toString(amount1) AS amount1,
    p.amount0 / pow(10, decimals0) AS value0,
    p.amount1 / pow(10, decimals1) AS value1,
    price   / pow(10, decimals1 - decimals0) AS price0,
    1.0 / price0 AS price1,
    protocol AS protocol,
    {network_id: String} AS network_id
FROM p
ORDER BY timestamp DESC
