WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8(notEmpty({signature:Array(String)}))   +
        toUInt8(notEmpty({source:Array(String)}))      +
        toUInt8(notEmpty({destination:Array(String)})) +
        toUInt8(notEmpty({authority:Array(String)}))   +
        toUInt8(notEmpty({mint:Array(String)}))
    AS n
),
/* 2) Union buckets from only active filters */
minutes_union AS
(
    SELECT minute
    FROM {db_transfers:Identifier}.transfers_by_signature
    WHERE (notEmpty({signature:Array(String)}) AND signature IN {signature:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers_by_source
    WHERE (notEmpty({source:Array(String)}) AND source IN {source:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers_by_destination
    WHERE (notEmpty({destination:Array(String)}) AND destination IN {destination:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers_by_authority
    WHERE (notEmpty({authority:Array(String)}) AND authority IN {authority:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers_by_mint
    WHERE (notEmpty({mint:Array(String)}) AND mint IN {mint:Array(String)})
    ORDER BY minute DESC
),
/* 3) Intersect: keep only buckets present in ALL active filters, i.e. if we filter by source & dest we'll have 2 minute ranges where they intersect - keep them*/
filtered_minutes AS
(
    SELECT minute FROM minutes_union
    WHERE (isNull({start_time:Nullable(UInt64)}) OR minute >= toRelativeMinuteNum(toDateTime({start_time:Nullable(UInt64)}))) AND (isNull({end_time:Nullable(UInt64)}) OR minute <= toRelativeMinuteNum(toDateTime({end_time:Nullable(UInt64)})))
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
/* Resolve block_num → timestamp via blocks table (ORDER BY block_num = instant lookup) */
block_start_ts AS
(
    SELECT maxOrNull(timestamp) AS ts FROM {db_transfers:Identifier}.blocks
    WHERE isNotNull({start_block:Nullable(UInt64)}) AND block_num = {start_block:Nullable(UInt64)}
),
block_end_ts AS
(
    SELECT maxOrNull(timestamp) AS ts FROM {db_transfers:Identifier}.blocks
    WHERE isNotNull({end_block:Nullable(UInt64)}) AND block_num = {end_block:Nullable(UInt64)}
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
    FROM {db_transfers:Identifier}.transfers t
    PREWHERE
        (isNull({start_time:Nullable(UInt64)}) OR timestamp >= {start_time:Nullable(UInt64)}) AND (isNull({end_time:Nullable(UInt64)}) OR timestamp <= {end_time:Nullable(UInt64)})
        AND (isNull({start_block:Nullable(UInt64)}) OR block_num >= {start_block:Nullable(UInt64)}) AND (isNull({end_block:Nullable(UInt64)}) OR block_num <= {end_block:Nullable(UInt64)})
        AND (
            (
                /* if no filters are active and no block range specified, search through the last minute only */
                (SELECT n FROM active_filters) = 0
                AND isNull({start_block:Nullable(UInt64)})
                AND isNull({end_block:Nullable(UInt64)})
                AND timestamp BETWEEN
                    greatest( toDateTime(coalesce({start_time:Nullable(UInt64)}, 0)), least(toDateTime(coalesce({end_time:Nullable(UInt64)}, 4294967295)), (SELECT ts FROM latest_ts)) - (INTERVAL 1 MINUTE + INTERVAL 1 * {offset:UInt64} SECOND))
                    AND least(toDateTime(coalesce({end_time:Nullable(UInt64)}, 4294967295)), (SELECT ts FROM latest_ts))
            )
            OR (
                /* if block range filters are active (no other filters), resolve block_num → timestamp
                   via the blocks table and use timestamp bounds to hit the primary index */
                (SELECT n FROM active_filters) = 0
                AND (isNotNull({start_block:Nullable(UInt64)}) OR isNotNull({end_block:Nullable(UInt64)}))
                AND timestamp >= coalesce((SELECT ts FROM block_start_ts), toDateTime(0))
                AND timestamp <= coalesce((SELECT ts FROM block_end_ts), toDateTime(4294967295))
            )
            /* if filters are active, search through the intersecting minute ranges */
            OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes)
        )
    WHERE
        /* filter the trimmed down minute ranges by the active filters */
        (empty({signature:Array(String)}) OR signature IN {signature:Array(String)})
        AND (empty({source:Array(String)}) OR source IN {source:Array(String)})
        AND (empty({destination:Array(String)}) OR destination IN {destination:Array(String)})
        AND (empty({authority:Array(String)}) OR authority IN {authority:Array(String)})
        AND (empty({mint:Array(String)}) OR mint IN {mint:Array(String)})
        AND (isNull({program_id:Nullable(String)}) OR program_id = {program_id:Nullable(String)})
    ORDER BY timestamp DESC, transaction_index DESC, instruction_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
spl_mints AS
(
    SELECT DISTINCT mint
    FROM filtered_transfers
    WHERE mint != 'So11111111111111111111111111111111111111111'
),
spl_metadata AS
(
    SELECT
        mint,
        if(empty(name), NULL, name) AS name,
        if(empty(symbol), NULL, symbol) AS symbol,
        if(empty(uri), NULL, uri) AS uri
    FROM (
        SELECT mint, name, symbol, uri
        FROM {db_metadata:Identifier}.metadata_view
        WHERE metadata IN (
            SELECT metadata
            FROM {db_metadata:Identifier}.metadata_mint_state
            WHERE mint IN (SELECT mint FROM spl_mints)
            GROUP BY metadata
        )
    )
    WHERE (SELECT count() FROM spl_mints) > 0
),
native_metadata AS
(
    SELECT
        'So11111111111111111111111111111111111111111' AS mint,
        'Native' AS name,
        'SOL' AS symbol,
        NULL AS uri
    WHERE 'So11111111111111111111111111111111111111111' IN (SELECT DISTINCT mint FROM filtered_transfers)
),
metadata AS
(
    SELECT * FROM spl_metadata
    UNION ALL
    SELECT * FROM native_metadata
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
ORDER BY timestamp DESC, transaction_index DESC, instruction_index DESC
