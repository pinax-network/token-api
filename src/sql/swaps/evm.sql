WITH
    {transaction_id:String} AS _tx,
    {caller:String}         AS _caller,
    {sender:String}         AS _sender,
    {recipient:String}      AS _recipient,
    {pool:String}           AS _pool,
    {protocol:String}       AS _protocol,
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
SELECT
    s.block_num,
    s.timestamp               AS datetime,
    s.transaction_id,
    s.caller,
    s.pool,
    s.sender,
    s.recipient,
    toString(s.amount0) as amount0,
    toString(s.amount1) as amount1,
    s.price         AS price0,
    1.0 / price0    AS price1,

    s.protocol,
    {network_id:String} AS network_id
FROM       swaps_core  AS s
ORDER BY   datetime DESC