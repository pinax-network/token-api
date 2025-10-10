WITH
filtered_transfers AS (
    SELECT
        block_num,
        timestamp,
        tx_hash,
        log_index,
        contract,
        `from`,
        `to`,
        value AS amount
    FROM transfers
    WHERE timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({address:Array(String)} = ['']  OR `from` IN {address:Array(String)} OR `to` IN {address:Array(String)})
        AND ({from_address:Array(String)} = ['']  OR `from` IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = ['']  OR `to` IN {to_address:Array(String)})
        AND ({contract:Array(String)} = [''] OR contract IN {contract:Array(String)})
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
    log_index,
    contract,
    `from`,
    `to`,
    name,
    symbol,
    decimals,
    toString(amount) AS amount,
    t.amount / pow(10, decimals) AS value,
    {network:String} AS network
FROM filtered_transfers AS t
LEFT JOIN metadata AS c USING contract
ORDER BY timestamp DESC
