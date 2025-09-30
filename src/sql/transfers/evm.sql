WITH
filtered_transfers AS (
    SELECT
        block_num,
        timestamp,
        tx_hash,
        contract,
        `from`,
        `to`,
        value AS amount
    FROM transfers
    WHERE timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND ({transaction_id:String} = '' OR tx_hash = {transaction_id:String})
        AND ({from:String} = ''  OR `from` = {from:String})
        AND ({to:String} = ''  OR `to` = {to:String})
        AND ({contract:String} = '' OR contract = {contract:String})
    ORDER BY timestamp DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
metadata AS
(
    SELECT
        contract,
        name,
        symbol,
        decimals
    FROM metadata_view
    WHERE contract IN (
        SELECT contract
        FROM filtered_transfers
    )
)
SELECT
    t.block_num as block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,
    toString(t.tx_hash) as transaction_id,
    contract,
    `from`,
    `to`,
    name,
    symbol,
    decimals,
    toString(amount) AS amount,
    t.amount / pow(10, decimals) AS value,
    {network_id:String} AS network_id
FROM filtered_transfers AS t
LEFT JOIN metadata AS c USING contract
ORDER BY timestamp DESC
