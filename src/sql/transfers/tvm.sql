/* Clean up transaction_id param: drop the sentinel '' if present */
WITH

arrayFilter(x -> x != '', {transaction_id:Array(String)}) AS tx_ids,
arrayFilter(x -> x != '', {from_address:Array(String)}) AS from_addresses,
arrayFilter(x -> x != '', {to_address:Array(String)}) AS to_addresses,
arrayFilter(x -> x != '', {contract:Array(String)}) AS contracts,
(length(tx_ids) > 0) AS has_tx_hash,
(length(from_addresses) > 0) AS has_from,
(length(to_addresses) > 0) AS has_to,
(length(contracts) > 0) AS has_contract,
has_contract AND NOT has_from AND NOT has_to AS is_contract_only,
has_from AND NOT has_to AND NOT has_contract AS is_from_only,
has_to AND NOT has_from AND NOT has_contract AS is_to_only,
has_contract AND has_to AND NOT has_from AS is_contract_to,
has_contract AND has_from AND NOT has_to AS is_contract_from,
has_contract AND has_from AND has_to AS is_contract_from_to,

tx_hash_timestamps AS (
    SELECT timestamp
    FROM trc20_transfer
    WHERE has_tx_hash AND tx_hash IN {transaction_id:Array(String)}
    GROUP BY timestamp
),
/* single filters */
from_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE
        is_from_only
        AND `from` IN {from_address:Array(String)}
    GROUP BY minute
),
to_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE
        is_to_only
        AND `to` IN {to_address:Array(String)}
    GROUP BY minute
),
contract_hours AS (
    SELECT toStartOfHour(toDateTime(minute * 60)) AS minute_hour
    FROM trc20_transfer
    WHERE
        is_contract_only
        AND log_address IN {contract:Array(String)}
    GROUP BY minute_hour
),
/* 2 filters */
contract_from_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE
        is_contract_from
        AND log_address IN {contract:Array(String)}
        AND `from`      IN {from_address:Array(String)}
    GROUP BY minute
),
contract_to_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE
        is_contract_to
        AND log_address IN {contract:Array(String)}
        AND `to`        IN {to_address:Array(String)}
    GROUP BY minute
),
/* 3 filters */
contract_from_to_minutes AS (
    SELECT minute
    FROM trc20_transfer
    WHERE
        is_contract_from_to
        AND log_address IN {contract:Array(String)}
        AND `from`      IN {from_address:Array(String)}
        AND `to`        IN {to_address:Array(String)}
    GROUP BY minute
),
transfers AS (
    SELECT * FROM trc20_transfer
    WHERE
        /* filter by timestamp and block_num early to reduce data scanned */
            ({start_time:UInt64} = 1420070400 OR timestamp >= toDateTime({start_time:UInt64}))
        AND ({end_time:UInt64} = 2524608000 OR timestamp <= toDateTime({end_time:UInt64}))
        AND ({start_block:UInt64} = 0 OR block_num >= {start_block:UInt64})
        AND ({end_block:UInt64} = 9999999999 OR block_num <= {end_block:UInt64})

        /* minute-based filters bound to single/double/triple mode */

        /* timestamp filter */
        AND ( NOT has_tx_hash OR timestamp IN tx_hash_timestamps AND tx_hash IN {transaction_id:Array(String)} )

        /* 3-filters: from + to + contract */
        AND ( NOT is_contract_from_to OR minute IN contract_from_to_minutes )

        /* 2-filters: (from + contract) and (to + contract) */
        AND ( NOT is_contract_from OR minute IN contract_from_minutes )
        AND ( NOT is_contract_to OR minute IN contract_to_minutes )

        /* 1-filter: from OR to OR contract alone */
        AND ( NOT is_from_only OR minute IN from_minutes )
        AND ( NOT is_to_only OR minute IN to_minutes )
        AND ( NOT is_contract_only OR toStartOfHour(toDateTime(minute * 60)) IN contract_hours )

        /* direct filters */
        AND ( NOT has_from OR `from` IN {from_address:Array(String)} )
        AND ( NOT has_to OR `to` IN {to_address:Array(String)} )
        AND ( NOT has_contract OR log_address IN {contract:Array(String)} )

    ORDER BY timestamp DESC, block_num DESC, tx_index DESC, log_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
distinct_contracts AS (
    SELECT DISTINCT log_address AS contract
    FROM transfers
),
metadata AS (
    SELECT DISTINCT
        contract,
        name,
        symbol,
        decimals
    FROM `tron:tvm-tokens@v0.1.2`.metadata
    WHERE contract IN distinct_contracts
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
LEFT JOIN metadata m ON t.log_address = m.contract
ORDER BY timestamp DESC, block_num DESC, tx_index DESC, log_index DESC;