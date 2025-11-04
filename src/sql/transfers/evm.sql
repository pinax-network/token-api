WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8({transaction_id:Array(String)} != ['']) +
        toUInt8({from_address:Array(String)}   != ['']) +
        toUInt8({to_address:Array(String)}     != ['']) +
        toUInt8({contract:Array(String)}       != [''])
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT minute
    FROM transfers_by_from
    WHERE ({from_address:Array(String)} != [''] AND `from` IN {from_address:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM transfers_by_to
    WHERE ({to_address:Array(String)} != [''] AND `to` IN {to_address:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM transfers_by_contract
    WHERE ({contract:Array(String)} != [''] AND contract IN {contract:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM transfers_by_tx_hash
    WHERE ({transaction_id:Array(String)} != [''] AND tx_hash IN {transaction_id:Array(String)})
    ORDER BY minute DESC
),
/* 3) Intersect: keep only buckets present in ALL active filters, bounded by requested time window */
filtered_minutes AS
(
    SELECT minute FROM minutes_union
    WHERE minute BETWEEN toRelativeMinuteNum(toDateTime({start_time: UInt64})) AND toRelativeMinuteNum(toDateTime({end_time: UInt64}))
    GROUP BY minute
    HAVING count() >= (SELECT n FROM active_filters)
    ORDER BY minute DESC
    LIMIT 1 BY minute
    LIMIT if(
        (SELECT n FROM active_filters) <= 1,
        toUInt64({limit:UInt64}) + toUInt64({offset:UInt64}),           /* safe to limit if there is 1 active filter */
        (toUInt64({limit:UInt64}) + toUInt64({offset:UInt64})) * 10     /* unsafe limit with a multiplier - usually safe but find a way to early return */
    )
),
/* Latest ingested timestamp in source table */
latest_ts AS
(
    SELECT max(timestamp) AS ts FROM transfers
),
filtered_transfers AS
(
    SELECT
        block_num,
        timestamp,
        tx_hash,
        log_index,
        contract,
        `from`,
        `to`,
        value AS amount
    FROM transfers t
    PREWHERE
        timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND (
            (
                /* if no filters are active search only the last minute */
                (SELECT n FROM active_filters) = 0
                AND timestamp BETWEEN
                    greatest( toDateTime({start_time:UInt64}), least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts)) - INTERVAL 1 MINUTE)
                    AND least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts))
            )
            /* if filters are active, search through the intersecting minute ranges */
            OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes)
        )
    WHERE
        ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({from_address:Array(String)} = ['']  OR `from` IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = ['']    OR `to` IN {to_address:Array(String)})
        AND ({contract:Array(String)} = ['']      OR contract IN {contract:Array(String)})
    ORDER BY timestamp DESC, tx_hash, log_index
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
metadata AS
(
    SELECT
        contract,
        name,
        symbol,
        decimals
    FROM metadata_view
    WHERE contract IN (
        SELECT contract
        FROM filtered_transfers
    )
)
SELECT
    t.block_num as block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,
    toString(t.tx_hash) as transaction_id,
    log_index,
    contract,
    `from`,
    `to`,
    name,
    symbol,
    decimals,
    toString(amount) AS amount,
    t.amount / pow(10, decimals) AS value,
    {network:String} AS network
FROM filtered_transfers AS t
LEFT JOIN metadata AS c USING contract
ORDER BY timestamp DESC, tx_hash, log_index
