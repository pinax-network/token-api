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
    SELECT
        block_num,
        timestamp,
        minute,
        tx_hash,
        tx_index,
        log_index,
        factory,
        pool,
        protocol,
        user,
        input_contract,
        output_contract,
        input_amount,
        output_amount
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
),

unique_contracts AS (
    SELECT input_contract AS contract FROM filtered_swaps
    UNION DISTINCT
    SELECT output_contract AS contract FROM filtered_swaps
),

metadata AS (
    SELECT
        m.contract AS contract,
        any(m.name) AS name,
        any(m.symbol) AS symbol,
        any(m.decimals) AS decimals,
        CAST((m.contract, any(m.symbol), any(m.name), any(m.decimals)) AS Tuple(address String, symbol Nullable(String), name Nullable(String), decimals Nullable(UInt8))) AS token_info
    FROM {db_evm_tokens:Identifier}.metadata_view AS m
    INNER JOIN unique_contracts AS u ON m.contract = u.contract
    GROUP BY m.contract
)

SELECT
    s.block_num AS block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,
    s.tx_hash AS transaction_id,
    toString(s.factory) AS factory,
    s.pool AS pool,
    s.user AS caller,
    s.user AS sender,
    s.user AS recipient,
    toString(s.input_amount) AS input_amount,
    s.input_amount / pow(10, m1.decimals) AS input_value,
    m1.token_info AS input_token,
    toString(s.output_amount) AS output_amount,
    s.output_amount / pow(10, m2.decimals) AS output_value,
    m2.token_info AS output_token,
    if(s.input_amount > 0, (s.output_amount / pow(10, m2.decimals)) / (s.input_amount / pow(10, m1.decimals)), 0) AS price,
    if(s.output_amount > 0, (s.input_amount / pow(10, m1.decimals)) / (s.output_amount / pow(10, m2.decimals)), 0) AS price_inv,
    s.protocol AS protocol,
    format('Swap {} {} for {} {} on {}',
        if(s.input_amount / pow(10, m1.decimals) > 1000, formatReadableQuantity(s.input_amount / pow(10, m1.decimals)), toString(s.input_amount / pow(10, m1.decimals))),
        m1.symbol,
        if(s.output_amount / pow(10, m2.decimals) > 1000, formatReadableQuantity(s.output_amount / pow(10, m2.decimals)), toString(s.output_amount / pow(10, m2.decimals))),
        m2.symbol,
        arrayStringConcat(
            arrayMap(x -> concat(upper(substring(x, 1, 1)), substring(x, 2)),
                     splitByChar('_', s.protocol)),
            ' '
        )
    ) AS summary,
    {network:String} AS network
FROM filtered_swaps AS s
LEFT JOIN metadata AS m1 ON s.input_contract = m1.contract
LEFT JOIN metadata AS m2 ON s.output_contract = m2.contract
ORDER BY s.timestamp DESC, s.tx_hash
