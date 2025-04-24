WITH
    {age:Int}            AS _age,
    {address:String}     AS _addr,
    {contract:String}    AS _contract,
    now() - _age * 86400 AS _ts_from,

transfers AS (

    SELECT  block_num,
            timestamp as datetime,
            transaction_id,
            contract,
            `from`,
            `to`,
            toString(erc20_transfers.value) as amount,
            value / pow(10, c.decimals) AS value,
            c.decimals AS decimals,
            c.symbol as symbol
    FROM erc20_transfers
    JOIN contracts AS c ON c.address = erc20_transfers.contract
    WHERE   timestamp >= _ts_from
        AND (_addr = ''     OR (`from` = _addr OR `to` = _addr))
        AND (_contract = '' OR contract = _contract)

    UNION ALL

    SELECT  block_num,
            timestamp as datetime,
            transaction_id,
            contract,
            `from`,
            `to`,
            toString(native_transfers.value) as amount,
            value / pow(10, 18) AS value,
            18 as decimals,
            'Native' AS symbol
    FROM native_transfers
    WHERE timestamp >= _ts_from
        AND (_addr = '' OR (`from` = _addr OR `to` = _addr))
)
SELECT *
FROM transfers
ORDER BY   datetime DESC;
