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
    WHERE timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND ({transaction_id:String} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({address:String} = ['']  OR `from` IN {address:Array(String)} OR `to` IN {address:Array(String)})
        AND ({from_address:String} = ['']  OR `from` IN {from_address:Array(String)})
        AND ({to_address:String} = ['']  OR `to` IN {to_address:Array(String)})
        AND ({contract:String} = [''] OR contract IN {contract:Array(String)})
    ORDER BY timestamp DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
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
    {network:String} AS network_id
FROM filtered_transfers AS t
LEFT JOIN metadata_view AS c USING contract
ORDER BY timestamp DESC
