/* ---------- parameter values ---------- */
WITH
    {transaction_id:String} AS _tx,
    {caller:String}         AS _caller,
    {sender:String}         AS _sender,
    {recipient:String}      AS _recipient,
    {pool:String}           AS _pool,
    {protocol:String}       AS _protocol,

/* ---------- the core set of swaps ---------- */
swaps_core AS (
    SELECT  *
    FROM    swaps
    WHERE   (_tx       = '' OR transaction_id = _tx)
        AND (_caller   = '' OR caller         = _caller)
        AND (_sender   = '' OR sender         = _sender)
        AND (_recipient= '' OR recipient      = _recipient)
        AND (_pool     = '' OR pool           = _pool)
        AND (_protocol = '' OR protocol       = _protocol)
)

/* ---------- final query ---------- */
SELECT
    s.block_num,
    s.timestamp               AS datetime,
    s.transaction_id,
    s.caller,
    s.pool,
    p.factory,
    ( p.token0, coalesce(trim(c0.symbol),''), c0.decimals ) AS token0,
    ( p.token1, coalesce(trim(c1.symbol),''), c1.decimals ) AS token1,
    s.sender,
    s.recipient,

    -- keep raw numbers numeric; format in the client if you must show strings
    s.amount0,
    s.amount1,

    s.amount0 / pow(10, c0.decimals)                                             AS value0,
    s.amount1 / pow(10, c1.decimals)                                             AS value1,
    s.price   / pow(10, c1.decimals - c0.decimals)                               AS price0,
    1.0 / price0                                                                 AS price1,

    p.protocol,
    {network_id:String}                                                          AS network_id
FROM       swaps_core  AS s
LEFT JOIN  pools       AS p   USING (pool)
LEFT JOIN  contracts   AS c0  ON c0.address = p.token0
LEFT JOIN  contracts   AS c1  ON c1.address = p.token1
ORDER BY   datetime DESC
LIMIT 1000;
