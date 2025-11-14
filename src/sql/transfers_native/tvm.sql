/* Clean up transaction_id param: drop the sentinel '' if present */
WITH

arrayFilter(x -> x != '', {transaction_id:Array(String)}) AS tx_ids,
arrayFilter(x -> x != '', {from_address:Array(String)}) AS from_addresses,
arrayFilter(x -> x != '', {to_address:Array(String)}) AS to_addresses,
(length(tx_ids) > 0) AS has_tx_hash,
(length(from_addresses) > 0) AS has_from,
(length(to_addresses) > 0) AS has_to,
{start_time:UInt64} = 1420070400 AS no_start_time,
{end_time:UInt64} = 2524608000 AS no_end_time,
{start_block:UInt64} = 0 AS no_start_block,
{end_block:UInt64} = 9999999999 AS no_end_block,

tx_hash_timestamps AS (
    SELECT (minute, timestamp)
    FROM native_transfer
    WHERE has_tx_hash AND tx_hash IN {transaction_id:Array(String)}
    GROUP BY minute, timestamp
),
from_minutes AS (
    SELECT minute
    FROM native_transfer
    WHERE
        has_from
        AND `from` IN {from_address:Array(String)}
        AND (no_start_time OR minute >= toRelativeMinuteNum(toDateTime({start_time:UInt64})))
    GROUP BY minute
),
to_minutes AS (
    SELECT minute
    FROM native_transfer
    WHERE
        has_to
        AND `to` IN {to_address:Array(String)}
        AND (no_start_time OR minute >= toRelativeMinuteNum(toDateTime({start_time:UInt64})))
    GROUP BY minute
)
SELECT
    /* block */
    t.block_num as block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,

    /* transaction */
    toString(t.tx_hash) as transaction_id,
    tx_index AS transaction_index,

    /* transfer */
    `from`,
    `to`,
    toString(t.amount) AS amount,
    t.amount / pow(10, decimals) AS value,

    /* token metadata */
    'Tron' AS name,
    'TRX' AS symbol,
    6 AS decimals,

    /* network */
    {network:String} AS network
FROM native_transfer AS t
WHERE
    /* filter by timestamp and block_num early to reduce data scanned */
        (no_start_time OR timestamp >= toDateTime({start_time:UInt64}))
    AND (no_end_time OR timestamp <= toDateTime({end_time:UInt64}))
    AND (no_start_block OR block_num >= {start_block:UInt64})
    AND (no_end_block OR block_num <= {end_block:UInt64})

    /* timestamp filters */
    AND (NOT has_tx_hash OR (minute, timestamp) IN tx_hash_timestamps)
    AND (NOT has_from OR minute IN from_minutes)
    AND (NOT has_to OR minute IN to_minutes)

    /* direct filters */
    AND (NOT has_tx_hash OR tx_hash IN {transaction_id:Array(String)})
    AND (NOT has_from OR `from` IN {from_address:Array(String)})
    AND (NOT has_to OR `to` IN {to_address:Array(String)})
ORDER BY minute DESC, timestamp DESC, block_num DESC, tx_index DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}