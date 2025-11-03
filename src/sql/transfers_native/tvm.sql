WITH
tx_hash_minutes AS (
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM native_transfer
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY tx_hash, minute
),
from_minutes AS (
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM native_transfer
    WHERE ({from_address:Array(String)} != [''] AND `from` IN {from_address:Array(String)})
    GROUP BY `from`, minute
),
to_minutes AS (
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM native_transfer
    WHERE ({to_address:Array(String)} != [''] AND `to` IN {to_address:Array(String)})
    GROUP BY `to`, minute
),
transfers AS (
    SELECT * FROM native_transfer
    WHERE
        /* filter by timestamp and block_num early to reduce data scanned */
            ({start_time:UInt64} = 1420070400 OR timestamp >= toDateTime({start_time:UInt64}))
        AND ({end_time:UInt64} = 2524608000 OR timestamp <= toDateTime({end_time:UInt64}))
        AND ({start_block:UInt64} = 0 OR block_num >= {start_block:UInt64})
        AND ({end_block:UInt64} = 9999999999 OR block_num <= {end_block:UInt64})

        /* filter by minute ranges if any filters are active */
        AND ({transaction_id:Array(String)} = [''] OR toRelativeMinuteNum(timestamp) IN tx_hash_minutes)
        AND ({from_address:Array(String)} = [''] OR toRelativeMinuteNum(timestamp) IN from_minutes)
        AND ({to_address:Array(String)} = [''] OR toRelativeMinuteNum(timestamp) IN to_minutes)

        /* filter by active filters if any */
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({from_address:Array(String)} = [''] OR `from` IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = [''] OR `to` IN {to_address:Array(String)})
    ORDER BY timestamp DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    /* block */
    t.block_num as block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,

    /* transaction */
    toString(t.tx_hash) as transaction_id,

    /* transfer */
    `from`,
    `to`,
    toString(t.amount) AS amount,
    t.amount / pow(10, decimals) AS value,

    /* token metadata */
    'Tron' AS name,
    'TRX' AS symbol,
    6 AS decimals,
    {network:String} AS network
FROM transfers AS t;