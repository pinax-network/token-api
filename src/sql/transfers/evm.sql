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
    FROM {db_transfers:Identifier}.transfers
    WHERE ({from_address:Array(String)} != [''] AND `from` IN {from_address:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE ({to_address:Array(String)} != [''] AND `to` IN {to_address:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE ({contract:Array(String)} != [''] AND log_address IN {contract:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
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
    SELECT max(timestamp) AS ts FROM {db_transfers:Identifier}.transfers
),
filtered_transfers AS
(
    SELECT *
    FROM {db_transfers:Identifier}.transfers t
    WHERE
            ((SELECT n FROM active_filters) = 0 OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes))
        AND timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND ({transaction_id:Array(String)} = [''] OR tx_hash IN {transaction_id:Array(String)})
        AND ({from_address:Array(String)} = ['']  OR `from` IN {from_address:Array(String)})
        AND ({to_address:Array(String)} = ['']    OR `to` IN {to_address:Array(String)})
        AND ({contract:Array(String)} = ['']      OR contract IN {contract:Array(String)})
    ORDER BY minute DESC, timestamp DESC, block_num DESC, log_ordinal DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    t.block_num as block_num,
    t.timestamp as datetime,
    toUnixTimestamp(t.timestamp) as timestamp,
    toString(t.tx_hash) as transaction_id,
    log_ordinal,
    log_index,
    log_address as contract,
    `from`,
    `to`,
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,
    toString(t.amount) AS amount,
    t.amount / pow(10, m.decimals) AS value,
    {network:String} AS network
FROM filtered_transfers AS t
LEFT JOIN metadata.metadata AS m ON m.network = {network:String} AND t.log_address = m.contract
ORDER BY minute DESC, timestamp DESC, block_num DESC, log_ordinal DESC
