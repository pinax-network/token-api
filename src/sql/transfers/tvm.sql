WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8({transaction_id:Array(String)} != ['']) +
        toUInt8({from_address:Array(String)} != ['']) +
        toUInt8({to_address:Array(String)} != ['']) +
        toUInt8({contract:Array(String)} != [''])
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM trc20_transfer
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY tx_hash, minute

    UNION ALL

    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM trc20_transfer
    WHERE ({from_address:Array(String)} != [''] AND `from` IN {from_address:Array(String)})
    GROUP BY `from`, minute

    UNION ALL

    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM trc20_transfer
    WHERE ({to_address:Array(String)} != [''] AND `to` IN {to_address:Array(String)})
    GROUP BY `to`, minute

    UNION ALL

    SELECT toRelativeMinuteNum(timestamp) AS minute
    FROM trc20_transfer
    WHERE ({contract:Array(String)} != [''] AND log_address IN {contract:Array(String)})
    GROUP BY log_address, minute
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
    SELECT max(timestamp) AS ts FROM trc20_transfer
),
transfers AS (
    SELECT * FROM trc20_transfer
    PREWHERE
        timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND (
            (
                /* if no filters are active search only the last 10 minutes */
                (SELECT n FROM active_filters) = 0
                AND timestamp BETWEEN
                    greatest( toDateTime({start_time:UInt64}), least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts)) - INTERVAL 10 MINUTE)
                    AND least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts))
            )
            /* if filters are active, search through the intersecting minute ranges */
            OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes)
        )
    WHERE
        /* filter by active filters if any */
        ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({from_address:Array(String)} = [''] OR `from` IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = [''] OR `to` IN {to_address:Array(String)})
        AND ({contract:Array(String)} = [''] OR log_address IN {contract:Array(String)})
    ORDER BY timestamp DESC, block_num DESC, block_hash DESC, tx_index DESC, log_index DESC
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
    tx_index AS transaction_index,

    /* log */
    log_index,
    log_ordinal,
    log_address AS contract,

    /* transfer */
    `from`,
    `to`,
    toString(t.amount) AS amount,
    t.amount / pow(10, decimals) AS value,

    /* token metadata */
    abi_hex_to_string(m.name_hex) AS name,
    abi_hex_to_string(m.symbol_hex) AS symbol,
    abi_hex_to_uint8(m.decimals_hex) AS decimals,
    {network:String} AS network
FROM transfers AS t
/* Get token metadata (name, symbol, decimals) */
JOIN metadata_rpc AS m ON t.log_address = m.contract
ORDER BY timestamp DESC, block_num DESC, tx_index DESC, log_index DESC;
