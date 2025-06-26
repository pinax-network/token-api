WITH s AS (
    SELECT
        block_num,
        timestamp,
        signature,
        program_id,
        pool,
        sender,
        amount0,
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
filtered_pools AS (
    SELECT
        pool,
        token0,
        token1
    FROM ohlc_prices
    WHERE ({pool:String} = '' OR pool = {pool:String})
    LIMIT 1
),
p AS (
    SELECT
        pool,
        c0.decimals AS decimals0,
        c1.decimals AS decimals1,
        CAST(( p.token0, 'TO IMPLEMENT', c0.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token0,
        CAST(( p.token1, 'TO IMPLEMENT', c1.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token1
    FROM filtered_pools AS p
    JOIN mints AS c0 ON c0.mint = p.token0
    JOIN mints AS c1 ON c1.mint = p.token1
)
SELECT
    s.block_num AS block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,
    s.signature AS transaction_id,
    s.pool AS pool,
    token0,
    token1,
    s.sender,
    toString(s.amount0) AS amount0,
    toString(s.amount1) AS amount1,
    s.amount0 / pow(10, decimals0) AS value0,
    s.amount1 / pow(10, decimals1) AS value1,
    s.price   / pow(10, decimals1 - decimals0) AS price0,
    1.0 / price0 AS price1,
    s.protocol AS protocol,
    {network_id: String} AS network_id
FROM s
JOIN p USING (pool)
ORDER BY timestamp DESC
