WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8(notEmpty({transaction_id:Array(String)})) +
        toUInt8(notEmpty({from_address:Array(String)})) +
        toUInt8(notEmpty({to_address:Array(String)}))
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT minute
    FROM {db_transfers:Identifier}.native_transfers
    WHERE (notEmpty({from_address:Array(String)}) AND `from` IN {from_address:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.native_transfers
    WHERE (notEmpty({to_address:Array(String)}) AND `to` IN {to_address:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.native_transfers
    WHERE (notEmpty({transaction_id:Array(String)}) AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY minute
),
/*
    Unified timestamp resolution for start_time/end_time and start_block/end_block.
    Uses coalesce instead of `isNull(X) OR timestamp >= (subquery)` because
    the OR pattern prevents ClickHouse from recognizing a clean primary-key range.
    greatest/least picks the tighter bound when both are provided.
    clamped_start_ts ensures the scan window is at most 1 hour wide for bare queries.
*/
start_ts AS (
    SELECT greatest(
        coalesce(toDateTime({start_time:Nullable(UInt64)}), toDateTime(0)),
        coalesce((SELECT timestamp FROM {db_transfers:Identifier}.blocks WHERE block_num >= {start_block:Nullable(UInt64)} ORDER BY block_num ASC LIMIT 1), toDateTime(0))
    ) AS ts
),
end_ts AS (
    SELECT least(
        coalesce(toDateTime({end_time:Nullable(UInt64)}), now()),
        coalesce((SELECT timestamp FROM {db_transfers:Identifier}.blocks WHERE block_num <= {end_block:Nullable(UInt64)} ORDER BY block_num DESC LIMIT 1), now())
    ) AS ts
),
clamped_start_ts AS (
    SELECT if(
        (SELECT n FROM active_filters) > 0,
        (SELECT ts FROM start_ts),
        greatest((SELECT ts FROM start_ts), (SELECT ts FROM end_ts) - INTERVAL 1 HOUR)
    ) AS ts
),
/* 3) Intersect: keep only buckets present in ALL active filters, bounded by requested time window */
filtered_minutes AS
(
    SELECT minute FROM minutes_union
    WHERE minute >= toRelativeMinuteNum((SELECT ts FROM clamped_start_ts))
      AND minute <= toRelativeMinuteNum((SELECT ts FROM end_ts))
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
filtered_transfers AS
(
    SELECT *
    FROM {db_transfers:Identifier}.native_transfers t
    WHERE
            ((SELECT n FROM active_filters) = 0 OR minute IN (SELECT minute FROM filtered_minutes))

        /* Primary-key pruning via unified timestamp bounds from start_ts/end_ts/clamped_start_ts CTEs */
        AND minute >= toRelativeMinuteNum((SELECT ts FROM clamped_start_ts))
        AND minute <= toRelativeMinuteNum((SELECT ts FROM end_ts))
        AND timestamp >= (SELECT ts FROM clamped_start_ts)
        AND timestamp <= (SELECT ts FROM end_ts)

        /* Fine-grained block_num exclusion — only rows on the exact boundary second are checked */
        AND NOT (isNotNull({start_block:Nullable(UInt64)}) AND timestamp = (SELECT ts FROM clamped_start_ts) AND block_num < {start_block:Nullable(UInt64)})
        AND NOT (isNotNull({end_block:Nullable(UInt64)})   AND timestamp = (SELECT ts FROM end_ts)           AND block_num > {end_block:Nullable(UInt64)})

        AND (empty({transaction_id:Array(String)}) OR tx_hash IN {transaction_id:Array(String)})
        AND (empty({from_address:Array(String)})  OR `from` IN {from_address:Array(String)})
        AND (empty({to_address:Array(String)})    OR `to` IN {to_address:Array(String)})
    ORDER BY minute DESC, timestamp DESC, block_num DESC
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
    tx_index as transaction_index,
    call_index,

    /* transfer */
    transfer_type as type,
    `from`,
    `to`,

    /* metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,
    if(m.display_name != '', m.display_name, m.name) AS display_name,
    if(m.display_symbol != '', m.display_symbol, m.symbol) AS display_symbol,

    /* amounts */
    toString(t.amount) AS amount,
    t.amount / pow(10, m.decimals) AS value,

    /* network */
    {network:String} AS network
FROM filtered_transfers AS t
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = '0x0000000000000000000000000000000000000000'
ORDER BY minute DESC, timestamp DESC, block_num DESC
