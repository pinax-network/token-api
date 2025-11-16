WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8({transaction_id:Array(String)} != ['']) +
        toUInt8({user:Array(String)} != ['']) +
        toUInt8({pool:Array(String)} != ['']) +
        toUInt8({factory:Array(String)} != ['']) +
        toUInt8({protocol:String} != '') +
        toUInt8({input_token:Array(String)} != ['']) +
        toUInt8({output_token:Array(String)} != [''])
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY tx_hash, minute

    UNION ALL

    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({user:Array(String)} != [''] AND user IN {user:Array(String)})
    GROUP BY user, minute

    UNION ALL

    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({pool:Array(String)} != [''] AND pool IN {pool:Array(String)})
    GROUP BY pool, minute

    UNION ALL

    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({factory:Array(String)} != [''] AND factory IN {factory:Array(String)})
    GROUP BY factory, minute

    UNION ALL

    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({protocol:String} != '' AND protocol = {protocol:String})
    GROUP BY protocol, minute

    UNION ALL

    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({input_token:Array(String)} != [''] AND input_contract IN {input_token:Array(String)})
    GROUP BY input_contract, minute

    UNION ALL

    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM swaps
    WHERE ({output_token:Array(String)} != [''] AND output_contract IN {output_token:Array(String)})
    GROUP BY output_contract, minute
),
filtered_minutes AS (
    SELECT minute FROM minutes_union
    WHERE minute BETWEEN toRelativeMinuteNum(toDateTime({start_time:UInt64})) AND toRelativeMinuteNum(toDateTime({end_time:UInt64}))
    GROUP BY minute
    HAVING count() >= (SELECT n FROM active_filters)
    ORDER BY minute DESC
    LIMIT 1 BY minute
    LIMIT if(
        (SELECT n FROM active_filters) <= 1,
        {limit:UInt64} + {offset:UInt64},           /* safe to limit if there is 1 active filter */
        ({limit:UInt64} + {offset:UInt64}) * 10     /* unsafe limit with a multiplier - usually safe but find a way to early return */
    )
),
/* Latest ingested timestamp in source table */
latest_ts AS
(
    SELECT max(timestamp) AS ts FROM swaps
),
filtered_swaps AS (
    SELECT * FROM swaps
    PREWHERE
        timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND (
            (
                /* if no filters are active search only the last 10 minutes */
                (SELECT n FROM active_filters) = 0
                AND timestamp BETWEEN
                    greatest( toDateTime({start_time:UInt64}), least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts)) - (INTERVAL 10 MINUTE + INTERVAL 10 * {offset:UInt64} SECOND))
                    AND least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts))
            )
            /* if filters are active, search through the intersecting minute ranges */
            OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes)
        )
    WHERE
        /* filter by active filters if any */
        ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({user:Array(String)} = [''] OR user IN {user:Array(String)})
        AND ({pool:Array(String)} = [''] OR pool IN {pool:Array(String)})
        AND ({factory:Array(String)} = [''] OR factory IN {factory:Array(String)})
        AND ({protocol:String} = '' OR protocol = {protocol:String})
        AND ({input_token:Array(String)} = [''] OR input_contract IN {input_token:Array(String)})
        AND ({output_token:Array(String)} = [''] OR output_contract IN {output_token:Array(String)})
    ORDER BY timestamp DESC, block_num DESC, block_hash DESC, tx_index DESC, log_index DESC
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
    CAST( ( s.input_contract, m1.symbol, m1.name, m1.decimals ) AS Tuple(address String, symbol Nullable(String), name Nullable(String), decimals Nullable(UInt8))) AS input_token,

    /* output token */
    toString(output_amount) AS output_amount,
    s.output_amount / pow(10, m2.decimals) AS output_value,
    CAST( ( s.output_contract, m2.symbol, m2.name, m2.decimals ) AS Tuple(address String, symbol Nullable(String), name Nullable(String), decimals Nullable(UInt8))) AS output_token,

    {network:String} AS network
FROM filtered_swaps AS s
LEFT JOIN {db_tvm_tokens:Identifier}.metadata AS m1 ON s.input_contract = m1.contract
LEFT JOIN {db_tvm_tokens:Identifier}.metadata AS m2 ON s.output_contract = m2.contract
ORDER BY timestamp DESC, block_num DESC, tx_index DESC, log_index DESC
