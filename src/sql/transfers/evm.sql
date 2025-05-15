WITH transfers AS (
    SELECT
        block_num,
        timestamp,
        transaction_id,
        contract,
        `from`,
        `to`,
        value
    FROM erc20_transfers
    UNION ALL
    SELECT
        block_num,
        timestamp,
        transaction_id,
        contract,
        `from`,
        `to`,
        value
    FROM native_transfers
),
t AS (
    SELECT
        block_num,
        timestamp,
        transaction_id,
        contract,
        `from`,
        `to`,
        value
    FROM transfers
    WHERE   timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
        AND ({transaction_id:String} = '' OR transaction_id = {transaction_id:String})
        AND ({from:String} = ''  OR `from` = {from:String})
        AND ({to:String} = ''  OR `to` = {to:String})
        AND ({contract:String} = '' OR contract = {contract:String})
    LIMIT   {limit:int}
    OFFSET  {offset:int}
)
SELECT
    t.block_num as block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,
    toString(t.transaction_id) as transaction_id,
    contract,
    `from`,
    `to`,
    if (contract = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 18, c.decimals) AS decimals,
    if (contract = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'Native', c.symbol) AS symbol,
    toString(t.value) as amount,
    value / pow(10, decimals) AS value
FROM t
LEFT JOIN contracts AS c ON c.address = t.contract
    AND ({contract:String} = '' OR c.address = {contract:String})
WHERE isNotNull(decimals)
ORDER BY timestamp DESC
