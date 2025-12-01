WITH

arrayFilter(x -> x != '', {transaction_id:Array(String)}) AS tx_ids,
arrayFilter(x -> x != '', {pool:Array(String)}) AS pools,

(length(tx_ids) > 0) AS has_tx_hash,
(length(pools) > 0) AS has_pool,

toRelativeMinuteNum(toDateTime({start_time:UInt64})) AS start_minute,
toRelativeMinuteNum(toDateTime({end_time:UInt64})) AS end_minute,
{start_time:UInt64} = 1420070400 AS no_start_time,
{end_time:UInt64} = 2524608000 AS no_end_time,
{start_block:UInt64} = 0 AS no_start_block,
{end_block:UInt64} = 9999999999 AS no_end_block,

tx_hash_timestamps AS (
    SELECT (minute, timestamp)
    FROM swaps
    WHERE has_tx_hash AND tx_hash IN {transaction_id:Array(String)}
    GROUP BY minute, timestamp
),

pool_minutes AS (
    SELECT minute
    FROM swaps
    WHERE has_pool AND pool IN {pool:Array(String)}
    GROUP BY minute
    LIMIT {limit:UInt64} + {offset:UInt64}
),

filtered_swaps AS (
    SELECT *
    FROM swaps
    WHERE
        /* direct minutes */
            (no_start_time OR minute >= start_minute)
        AND (no_end_time OR minute <= end_minute)

        /* transaction ID filter */
        AND ( NOT has_tx_hash OR (minute, timestamp) IN tx_hash_timestamps AND tx_hash IN {transaction_id:Array(String)} )

        /* minute filters */
        AND ( NOT has_pool OR minute IN pool_minutes )

        /* direct filters */
        AND ( NOT has_pool OR pool IN {pool:Array(String)} )

        /* timestamp and block_num filters */
        AND (no_start_block OR block_num >= {start_block:UInt64})
        AND (no_end_block OR block_num <= {end_block:UInt64})
        AND (no_start_time OR timestamp >= toDateTime({start_time:UInt64}))
        AND (no_end_time OR timestamp <= toDateTime({end_time:UInt64}))

    ORDER BY minute DESC, timestamp DESC, block_num DESC, tx_index DESC, log_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)

SELECT
    block_num,
    timestamp AS datetime,
    toUnixTimestamp(timestamp) AS timestamp,
    tx_hash AS transaction_id,
    toString(factory) AS factory,
    pool,
    input_contract AS input_token,
    output_contract AS output_token,
    user AS caller,
    user AS sender,
    user AS recipient,
    input_amount,
    output_amount,
    protocol,
    {network:String} AS network
FROM filtered_swaps
ORDER BY timestamp DESC, tx_hash
