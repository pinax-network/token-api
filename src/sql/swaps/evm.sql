WITH s AS (
    SELECT
        block_num,
        timestamp,
        tx_hash,
        caller,
        pool,
        sender,
        recipient,
        amount0,
        amount1,
        price,
        protocol
    FROM swaps
    WHERE timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND ({transaction_id:String} = '' OR tx_hash = {transaction_id:String})
        AND ({caller:String}     = '' OR caller         = {caller:String})
        AND ({sender:String}     = '' OR sender         = {sender:String})
        AND ({recipient:String}  = '' OR recipient      = {recipient:String})
        AND ({pool:String}       = '' OR pool           = {pool:String})
        AND ({protocol:String}   = '' OR protocol       = {protocol:String})
    ORDER BY timestamp DESC
    LIMIT   {limit:int}
    OFFSET  {offset:int}
),
filtered_pools AS (
    SELECT
        pool,
        factory,
        token0,
        token1
    FROM pools
    WHERE ({pool:String} = '' OR pool = {pool:String})
    AND ({protocol:String} = '' OR protocol = {protocol:String})
),
p AS (
    SELECT
        pool,
        factory,
        c0.decimals AS decimals0,
        c1.decimals AS decimals1,
        CAST(( p.token0, if(isNull(c0.symbol), '', c0.symbol), c0.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token0,
        CAST(( p.token1, if(isNull(c1.symbol), '', c1.symbol), c1.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token1
    FROM filtered_pools AS p
    JOIN erc20_metadata_initialize  AS c0 ON c0.address = p.token0
    JOIN erc20_metadata_initialize  AS c1 ON c1.address = p.token1
)
SELECT
    s.block_num         AS block_num,
    s.timestamp         AS datetime,
    toUnixTimestamp(s.timestamp) as timestamp,
    s.tx_hash    AS transaction_id,
    s.caller            AS caller,
    s.pool              AS pool,
    p.factory           AS factory,
    token0,
    token1,
    s.sender,
    s.recipient,
    toString(s.amount0) as amount0,
    toString(s.amount1) as amount1,
    s.amount0 / pow(10, decimals0) AS value0,
    s.amount1 / pow(10, decimals1) AS value1,
    s.price   / pow(10, decimals1 - decimals0) AS price0,
    1.0 / price0 AS price1,
    s.protocol as protocol,
    {network_id:String} as network_id
FROM s
JOIN p USING (pool)
ORDER BY timestamp DESC
