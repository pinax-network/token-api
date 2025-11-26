
WITH

arrayFilter(x -> x != '', {transaction_id:Array(String)}) AS tx_ids,
arrayFilter(x -> x != '', {from_address:Array(String)}) AS from_addresses,
arrayFilter(x -> x != '', {to_address:Array(String)}) AS to_addresses,
arrayFilter(x -> x != '', {contract:Array(String)}) AS contracts,

(length(tx_ids) > 0) AS has_tx_hash,
(length(from_addresses) > 0) AS has_from,
(length(to_addresses) > 0) AS has_to,
(length(contracts) > 0) AS has_contract,
has_contract AND (NOT has_from) AND (NOT has_to) AS has_only_contract,

toRelativeMinuteNum(toDateTime({start_time:UInt64})) AS start_minute,
toRelativeMinuteNum(toDateTime({end_time:UInt64})) AS end_minute,
{start_time:UInt64} = 1420070400 AS no_start_time,
{end_time:UInt64} = 2524608000 AS no_end_time,
{start_block:UInt64} = 0 AS no_start_block,
{end_block:UInt64} = 9999999999 AS no_end_block,

tx_hash_timestamps AS (
    SELECT (minute, timestamp)
    FROM trc20_transfer
    WHERE has_tx_hash AND tx_hash IN {transaction_id:Array(String)}
    GROUP BY minute, timestamp
),
/* minute filters */
from_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE has_from AND `from` IN {from_address:Array(String)}
    GROUP BY minute
),
to_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE has_to AND `to` IN {to_address:Array(String)}
    GROUP BY minute
),
/* USDT has very high volume, so we need to limit the number of minutes we scan */
contract_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE has_only_contract
        AND (no_start_time OR minute >= start_minute)
        AND (no_end_time OR minute <= end_minute)
        AND log_address IN {contract:Array(String)}
    GROUP BY minute
    ORDER BY minute DESC
    LIMIT 100000
),
transfers AS (
    SELECT *
    FROM trc20_transfer
    WHERE
        /* direct minutes */
            (no_start_time OR minute >= start_minute)
        AND (no_end_time OR minute <= end_minute)

        /* transaction ID filter */
        AND ( NOT has_tx_hash OR (minute, timestamp) IN tx_hash_timestamps AND tx_hash IN {transaction_id:Array(String)} )

        /* minute filters */
        AND ( NOT has_from OR minute IN from_minutes )
        AND ( NOT has_to OR minute IN to_minutes )
        AND ( NOT has_only_contract OR minute IN contract_minutes )

        /* direct filters */
        AND ( NOT has_from OR `from` IN {from_address:Array(String)} )
        AND ( NOT has_to OR `to` IN {to_address:Array(String)} )
        AND ( NOT has_contract OR log_address IN {contract:Array(String)} )

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
    /* block */
    block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,

    /* transaction */
    toString(t.tx_hash) as transaction_id,
    tx_index AS transaction_index,

    /* log */
    log_index,
    log_ordinal,
    log_address AS contract,

    /* transfer */
    `from`,
    `to`,
    toString(t.amount) AS amount,

    /* token metadata */
    t.amount / pow(10, decimals) AS value,
    name,
    symbol,
    decimals,

    /* network */
    {network:String} AS network
FROM transfers AS t
ANY LEFT JOIN metadata m ON t.log_address = m.contract
ORDER BY minute DESC, timestamp DESC, block_num DESC, tx_index DESC, log_index DESC;
