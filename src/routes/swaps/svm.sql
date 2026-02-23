WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8(notEmpty({signature:Array(String)}))    +
        toUInt8(notEmpty({amm:Array(String)}))          +
        toUInt8(notEmpty({amm_pool:Array(String)}))     +
        toUInt8(notEmpty({user:Array(String)}))         +
        toUInt8(notEmpty({input_mint:Array(String)}))   +
        toUInt8(notEmpty({output_mint:Array(String)}))  +
        toUInt8(notEmpty({program_id:Array(String)}))
    AS n
),
/* 2) Union buckets from only active filters */
minutes_union AS
(
    SELECT minute
    FROM {db_dex:Identifier}.swaps_by_signature
    WHERE (notEmpty({signature:Array(String)}) AND signature IN {signature:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps_by_amm
    WHERE (notEmpty({amm:Array(String)}) AND amm IN {amm:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps_by_amm_pool
    WHERE (notEmpty({amm_pool:Array(String)}) AND amm_pool IN {amm_pool:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps_by_user
    WHERE (notEmpty({user:Array(String)}) AND user IN {user:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps_by_input_mint
    WHERE (notEmpty({input_mint:Array(String)}) AND input_mint IN {input_mint:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps_by_output_mint
    WHERE (notEmpty({output_mint:Array(String)}) AND output_mint IN {output_mint:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps_by_program_id
    WHERE (notEmpty({program_id:Array(String)}) AND program_id IN {program_id:Array(String)})
    ORDER BY minute DESC
),
/* 3) Intersect: keep only buckets present in ALL active filters */
filtered_minutes AS
(
    SELECT minute FROM minutes_union
    WHERE (isNull({start_time:Nullable(UInt64)}) OR minute >= toRelativeMinuteNum(toDateTime({start_time:Nullable(UInt64)})))
      AND (isNull({end_time:Nullable(UInt64)}) OR minute <= toRelativeMinuteNum(toDateTime({end_time:Nullable(UInt64)})))
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
    SELECT max(timestamp) AS ts FROM {db_dex:Identifier}.swaps
),
filtered_swaps AS
(
    SELECT
        block_num,
        timestamp,
        transaction_index,
        instruction_index,
        signature,
        program_id,
        program_names(program_id) AS program_name,
        amm,
        amm_pool,
        user,
        input_mint,
        input_amount,
        output_mint,
        output_amount
    FROM {db_dex:Identifier}.swaps s
    PREWHERE
        (isNull({start_time:Nullable(UInt64)}) OR timestamp >= {start_time:Nullable(UInt64)}) AND (isNull({end_time:Nullable(UInt64)}) OR timestamp <= {end_time:Nullable(UInt64)})
        AND (isNull({start_block:Nullable(UInt64)}) OR block_num >= {start_block:Nullable(UInt64)}) AND (isNull({end_block:Nullable(UInt64)}) OR block_num <= {end_block:Nullable(UInt64)})
        AND (
            (
                /* if no filters are active and no block range specified, search through the last 10 minutes only */
                (SELECT n FROM active_filters) = 0
                AND isNull({start_block:Nullable(UInt64)})
                AND isNull({end_block:Nullable(UInt64)})
                AND timestamp BETWEEN
                    greatest( toDateTime(coalesce({start_time:Nullable(UInt64)}, 0)), least(toDateTime(coalesce({end_time:Nullable(UInt64)}, 4294967295)), (SELECT ts FROM latest_ts)) - (INTERVAL 10 MINUTE + INTERVAL 1 * {offset:UInt64} SECOND))
                    AND least(toDateTime(coalesce({end_time:Nullable(UInt64)}, 4294967295)), (SELECT ts FROM latest_ts))
            )
            OR (
                /* if only block range filters are active (no other filters), bypass the 10-minute safety net;
                   block_num PREWHERE above handles the filtering. Require start_time or end_time alongside
                   block filters when possible for primary index efficiency. */
                (SELECT n FROM active_filters) = 0
                AND (isNotNull({start_block:Nullable(UInt64)}) OR isNotNull({end_block:Nullable(UInt64)}))
            )
            /* if filters are active, search through the intersecting minute ranges */
            OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes)
        )
    WHERE
        /* filter the trimmed down minute ranges by the active filters */
        (empty({signature:Array(String)})     OR signature      IN {signature:Array(String)})
        AND (empty({amm:Array(String)})           OR amm            IN {amm:Array(String)})
        AND (empty({amm_pool:Array(String)})      OR amm_pool       IN {amm_pool:Array(String)})
        AND (empty({user:Array(String)})          OR user           IN {user:Array(String)})
        AND (empty({input_mint:Array(String)})    OR input_mint     IN {input_mint:Array(String)})
        AND (empty({output_mint:Array(String)})   OR output_mint    IN {output_mint:Array(String)})
        AND (empty({program_id:Array(String)})    OR program_id     IN {program_id:Array(String)})
    ORDER BY timestamp DESC, transaction_index DESC, instruction_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,
    toString(signature) AS signature,
    transaction_index,
    instruction_index,
    toString(program_id) AS program_id,
    program_name,
    toString(amm) AS amm,
    toString(amm_pool) AS amm_pool,
    toString(user) AS user,
    toString(input_mint) AS input_mint,
    input_amount,
    toString(output_mint) AS output_mint,
    output_amount,
    {network:String} AS network
FROM filtered_swaps AS s
ORDER BY timestamp DESC, transaction_index DESC, instruction_index DESC
