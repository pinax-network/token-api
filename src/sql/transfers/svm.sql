WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8({signature:Array(String)}   != ['']) +
        toUInt8({source:Array(String)}      != ['']) +
        toUInt8({destination:Array(String)} != ['']) +
        toUInt8({authority:Array(String)}   != ['']) +
        toUInt8({mint:Array(String)}        != [''])
    AS n
),
/* 2) Union buckets from only active filters */
minutes_union AS
(
    SELECT minute
    FROM transfers_by_signature
    WHERE ({signature:Array(String)} != [''] AND signature IN {signature:Array(String)})
    ORDER BY minute DESC
    LIMIT 1 /* there can only be one time range with our trx, so use early return */

    UNION ALL

    SELECT minute
    FROM transfers_by_source
    WHERE ({source:Array(String)} != [''] AND source IN {source:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM transfers_by_destination
    WHERE ({destination:Array(String)} != [''] AND destination IN {destination:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM transfers_by_authority
    WHERE ({authority:Array(String)} != [''] AND authority IN {authority:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM transfers_by_mint
    WHERE ({mint:Array(String)} != [''] AND mint IN {mint:Array(String)})
    ORDER BY minute DESC
),
/* 3) Intersect: keep only buckets present in ALL active filters, i.e. if we filter by source & dest we'll have 2 minute ranges where they intersect - keep them*/
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
filtered_transfers AS
(
    SELECT
        block_num,
        timestamp,
        signature,
        transaction_index,
        instruction_index,
        program_id,
        authority,
        mint,
        source,
        destination,
        amount,
        decimals,
        t.amount /
        CASE
            WHEN decimals IS NOT NULL THEN pow(10, decimals)
            ELSE 1
        END AS value
    FROM transfers t
    PREWHERE
        timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND (
            (
                /* if no filters are active, search through the last hour only */
                (SELECT n FROM active_filters) = 0
                AND timestamp BETWEEN
                    greatest( toDateTime({start_time:UInt64}), least(toDateTime({end_time:UInt64}), now()) - INTERVAL 1 HOUR)
                    AND least(toDateTime({end_time:UInt64}), now())
            )
            /* if filters are active, search through the intersecting minute ranges */
            OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes)
        )
    WHERE
        /* filter the trimmed down minute ranges by the active filters */
        ({signature:Array(String)} = [''] OR signature IN {signature:Array(String)})
        AND ({source:Array(String)} = [''] OR source IN {source:Array(String)})
        AND ({destination:Array(String)} = [''] OR destination IN {destination:Array(String)})
        AND ({authority:Array(String)} = [''] OR authority IN {authority:Array(String)})
        AND ({mint:Array(String)} = [''] OR mint IN {mint:Array(String)})
        AND ({program_id:String} = '' OR program_id = {program_id:String})
    ORDER BY timestamp DESC, transaction_index, instruction_index
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
metadata AS
(
    SELECT
        mint,
        if(empty(name), NULL, name) AS name,
        if(empty(symbol), NULL, symbol) AS symbol,
        if(empty(uri), NULL, uri) AS uri
    FROM metadata_view
    WHERE metadata IN (
        SELECT metadata
        FROM metadata_mint_state_latest
        WHERE mint IN (SELECT DISTINCT mint FROM filtered_transfers)
        GROUP BY metadata
    )
)
SELECT
    block_num,
    t.timestamp AS datetime,
    toUnixTimestamp(t.timestamp) AS timestamp,
    signature,
    transaction_index,
    instruction_index,
    program_id,
    mint,
    authority,
    source,
    destination,
    toString(amount) AS amount,
    value,
    decimals,
    name,
    symbol,
    uri,
    {network:String} AS network
FROM filtered_transfers AS t
LEFT JOIN metadata USING mint
ORDER BY timestamp DESC, transaction_index, instruction_index
