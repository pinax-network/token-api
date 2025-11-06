WITH
tx_hash_minutes AS (
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY tx_hash, minute
),
user_minutes AS (
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({user:Array(String)} != [''] AND user IN {user:Array(String)})
    GROUP BY user, minute
),
pool_minutes AS (
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({pool:Array(String)} != [''] AND pool IN {pool:Array(String)})
    GROUP BY pool, minute
),
input_token_minutes AS (
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({input_token:Array(String)} != [''] AND input_contract IN {input_token:Array(String)})
    GROUP BY input_contract, minute
),
output_token_minutes AS (
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({output_token:Array(String)} != [''] AND output_contract IN {output_token:Array(String)})
    GROUP BY output_contract, minute
),
factory_dates AS (
    SELECT toDate(addMinutes(toDateTime('1970-01-01 00:00:00'), toRelativeMinuteNum(timestamp))) AS date
    FROM swaps
    WHERE ({factory:Array(String)} != [''] AND factory IN {factory:Array(String)})
    GROUP BY factory, date
),
protocol_dates AS (
    SELECT toDate(addMinutes(toDateTime('1970-01-01 00:00:00'), toRelativeMinuteNum(timestamp))) AS date
    FROM swaps
    WHERE ({protocol:String} != '' AND protocol = {protocol:String})
    GROUP BY protocol, date
),
filtered_swaps AS (
    SELECT * FROM swaps
    WHERE
        /* filter by timestamp and block_num early to reduce data scanned */
            ({start_time:UInt64} = 1420070400 OR timestamp >= toDateTime({start_time:UInt64}))
        AND ({end_time:UInt64} = 2524608000 OR timestamp <= toDateTime({end_time:UInt64}))
        AND ({start_block:UInt64} = 0 OR block_num >= {start_block:UInt64})
        AND ({end_block:UInt64} = 9999999999 OR block_num <= {end_block:UInt64})

        /* filter by minute ranges if any filters are active */
        AND ({transaction_id:Array(String)} = [''] OR toRelativeMinuteNum(timestamp) IN tx_hash_minutes)
        AND ({user:Array(String)} = [''] OR toRelativeMinuteNum(timestamp) IN user_minutes)
        AND ({pool:Array(String)} = [''] OR toRelativeMinuteNum(timestamp) IN pool_minutes)
        AND ({factory:Array(String)} = [''] OR toDate(timestamp) IN factory_dates)
        AND ({protocol:String} = '' OR toDate(timestamp) IN protocol_dates)
        AND ({input_token:Array(String)} = [''] OR toRelativeMinuteNum(timestamp) IN input_token_minutes)
        AND ({output_token:Array(String)} = [''] OR toRelativeMinuteNum(timestamp) IN output_token_minutes)

        /* filter by active filters if any */
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({user:Array(String)} = [''] OR user IN {user:Array(String)})
        AND ({pool:Array(String)} = [''] OR pool IN {pool:Array(String)})
        AND ({factory:Array(String)} = [''] OR factory IN {factory:Array(String)})
        AND ({protocol:String} = '' OR protocol = {protocol:String})
        AND ({input_token:Array(String)} = [''] OR input_contract IN {input_token:Array(String)})
        AND ({output_token:Array(String)} = [''] OR output_contract IN {output_token:Array(String)})
    ORDER BY timestamp DESC, block_num DESC, tx_index DESC, log_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    /* block */
    s.block_num as block_num,
    s.timestamp as datetime,
    toUnixTimestamp(s.timestamp) as timestamp,

    /* transaction */
    toString(s.tx_hash) as transaction_id,
    tx_index AS transaction_index,

    /* log */
    log_index,
    log_ordinal,
    log_address,
    log_topic0,

    /* swap */
    protocol,
    factory,
    pool,
    user,

    /* input token */
    toString(input_amount) AS input_amount,
    s.input_amount / pow(10, m1.decimals) AS input_value,
    CAST( ( s.input_contract, m1.symbol, m1.name, m1.decimals ) AS Tuple(address String, symbol String, name String, decimals UInt8)) AS input_token,

    /* output token */
    toString(output_amount) AS output_amount,
    s.output_amount / pow(10, m2.decimals) AS output_value,
    CAST( ( s.output_contract, m2.symbol, m2.name, m2.decimals ) AS Tuple(address String, symbol String, name String, decimals UInt8)) AS output_token,

    {network:String} AS network
FROM filtered_swaps AS s
LEFT JOIN `tron:tvm-tokens@v0.1.1`.metadata AS m1 ON s.input_contract = m1.contract
LEFT JOIN `tron:tvm-tokens@v0.1.1`.metadata AS m2 ON s.output_contract = m2.contract
