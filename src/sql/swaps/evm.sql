WITH
    {transaction_id:String} AS _tx,
    {caller:String}         AS _caller,
    {sender:String}         AS _sender,
    {recipient:String}      AS _recipient,
    {pool:String}           AS _pool,
    {protocol:String}       AS _protocol,
    {factory:String}        AS _factory,
    {token:String}          AS _token,
    {symbol:String}         AS _symbol,
swaps_core AS (
    SELECT  *
    FROM    swaps
    WHERE   (_tx       = '' OR transaction_id = _tx)
        AND (_caller   = '' OR caller         = _caller)
        AND (_sender   = '' OR sender         = _sender)
        AND (_recipient= '' OR recipient      = _recipient)
        AND (_pool     = '' OR pool           = _pool)
        AND (_protocol = '' OR protocol       = _protocol)
    ORDER BY timestamp DESC
)
SELECT
    s.block_num         AS block_num,
    s.timestamp         AS datetime,
    s.transaction_id    AS transaction_id,
    s.caller            AS caller,
    s.pool              AS pool,
    p.factory           AS factory,
    CAST(( pools.token0, c0.symbol, c0.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token0,
    CAST(( pools.token1, c1.symbol, c1.decimals ) AS Tuple(address String, symbol  String, decimals UInt8)) AS token1,
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
FROM swaps_core AS s
JOIN pools      AS p USING (pool)
JOIN contracts  AS c0 FINAL ON c0.address = p.token0
JOIN contracts  AS c1 FINAL ON c1.address = p.token1
WHERE
        if (_factory  = '', true, p.factory = _factory)
    AND if (_token    = '', true, c0.address = _token OR c1.address = _token)
    AND if (_symbol    = '', true, c0.symbol = _symbol OR c1.symbol = _symbol)
