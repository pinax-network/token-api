/* Clean up transaction_id param: drop the sentinel '' if present */
WITH

arrayFilter(x -> x != '', {transaction_id:Array(String)}) AS tx_ids,
arrayFilter(x -> x != '', {from_address:Array(String)}) AS from_addresses,
arrayFilter(x -> x != '', {to_address:Array(String)}) AS to_addresses,

(length(tx_ids) > 0) AS has_tx_hash,
(length(from_addresses) > 0) AS has_from,
(length(to_addresses) > 0) AS has_to,

toRelativeMinuteNum(toDateTime({start_time:UInt64})) AS start_minute,
toRelativeMinuteNum(toDateTime({end_time:UInt64})) AS end_minute,
{start_time:UInt64} = 1420070400 AS no_start_time,
{end_time:UInt64} = 2524608000 AS no_end_time,
{start_block:UInt64} = 0 AS no_start_block,
{end_block:UInt64} = 9999999999 AS no_end_block,

/* timestamp filter */
tx_hash_timestamps AS (
    SELECT (minute, timestamp)
    FROM transactions
    WHERE has_tx_hash AND tx_hash IN {transaction_id:Array(String)}
    GROUP BY minute, timestamp
),
/* minute filters */
minutes AS (
    SELECT minute
    FROM transactions
    WHERE
            (no_start_time OR minute >= start_minute)
        AND (no_end_time OR minute <= end_minute)
        AND (NOT has_from OR `tx_from` IN {from_address:Array(String)} )
        AND (NOT has_to OR `tx_to` IN {to_address:Array(String)} )

    GROUP BY minute
    /* TO-DO only do LIMIT if no_start_block and no_end_block */
    /* block_num is filtered after minutes selection */
    LIMIT {limit:UInt64} + {offset:UInt64}
),

filtered_transfers AS (
    SELECT *
    FROM transactions
    WHERE
        /* direct minutes */
        /* PRIMARY KEY */
            (no_start_time OR minute >= start_minute)
        AND (no_end_time OR minute <= end_minute)

        /* transaction ID filter */
        /* PRIMARY KEY */
        AND ( NOT has_tx_hash OR (minute, timestamp) IN tx_hash_timestamps AND tx_hash IN {transaction_id:Array(String)} )

        /* minute filters */
        /* PRIMARY KEY */
        AND ( NOT (has_from OR has_to) OR minute IN minutes )

        /* timestamp and block_num filters */
        /* SECONDARY PRIMARY KEY */
        AND (no_start_block OR block_num >= {start_block:UInt64})
        AND (no_end_block OR block_num <= {end_block:UInt64})
        AND (no_start_time OR timestamp >= toDateTime({start_time:UInt64}))
        AND (no_end_time OR timestamp <= toDateTime({end_time:UInt64}))

        /* direct filters */
        /* NON-PRIMARY KEY */
        AND ( NOT has_from OR `tx_from` IN {from_address:Array(String)} )
        AND ( NOT has_to OR `tx_to` IN {to_address:Array(String)} )

    ORDER BY minute DESC, timestamp DESC, block_num DESC, tx_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    /* block */
    block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,

    /* transaction */
    toString(t.tx_hash) as transaction_id,
    tx_index AS transaction_index,

    /* call */
    /* call_index AS call_index, */

    /* transfer */
    `tx_from` as `from`,
    `tx_to` as `to`,
    toString(t.tx_value) AS amount,

    /* token metadata */
    t.tx_value / pow(10, decimals) AS value,
    name,
    symbol,
    decimals,

    /* network */
    {network:String} AS network
FROM filtered_transfers AS t
LEFT JOIN metadata m ON m.network = {network:String} AND m.contract = ''
ORDER BY minute DESC, timestamp DESC, block_num DESC, tx_index DESC;