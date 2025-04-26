WITH transfers AS (
    SELECT * FROM erc20_transfers
    UNION ALL
    SELECT * FROM native_transfers
),
t AS (
    SELECT *
    FROM transfers
    WHERE   timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
        AND ({from:String} = ''  OR `from` = {from:String})
        AND ({to:String} = ''  OR `to` = {to:String})
        AND ({contract:String} = '' OR contract = {contract:String})
    ORDER BY timestamp DESC
    LIMIT   {limit:int}
    OFFSET  {offset:int}
)
SELECT
    t.block_num as block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,
    t.transaction_id as transaction_id,
    contract,
    `from`,
    `to`,
    if (contract = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 18, c.decimals) AS decimals,
    if (contract = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'Native', c.symbol) AS symbol,
    toString(t.value) as amount,
    value / pow(10, decimals) AS value
FROM t
JOIN contracts AS c ON c.address = t.contract