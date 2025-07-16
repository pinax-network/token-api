WITH
filtered_transfers AS (
    SELECT
        block_num,
        timestamp,
        tx_hash,
        contract,
        `from`,
        `to`,
        value
    FROM transfers
    WHERE timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
        AND ({transaction_id:String} = '' OR tx_hash = {transaction_id:String})
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
    toString(t.tx_hash) as transaction_id,
    contract,
    `from`,
    `to`,
    decimals,
    symbol,
    value
FROM filtered_transfers AS t
LEFT JOIN erc20_metadata_initialize AS c ON c.address = t.contract
