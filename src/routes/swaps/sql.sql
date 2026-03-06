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
/*
    Unified timestamp resolution for start_time/end_time and start_block/end_block.
    Uses coalesce instead of `isNull(X) OR timestamp >= (subquery)` because
    the OR pattern prevents ClickHouse from recognizing a clean primary-key range.
    greatest/least picks the tighter bound when both are provided.
    clamped_start_ts ensures the scan window is at most 10 minutes wide.
*/
start_ts AS (
    SELECT greatest(
        coalesce(toDateTime({start_time:Nullable(UInt64)}), toDateTime(0)),
        coalesce((SELECT timestamp FROM {db_dex:Identifier}.blocks WHERE block_num >= {start_block:Nullable(UInt32)} ORDER BY block_num ASC LIMIT 1), toDateTime(0))
    ) AS ts
),
max_ts AS (
    SELECT max(timestamp) AS ts FROM {db_dex:Identifier}.blocks
),
end_ts AS (
    SELECT least(
        coalesce(toDateTime({end_time:Nullable(UInt64)}), (SELECT ts FROM max_ts)),
        coalesce((SELECT timestamp FROM {db_dex:Identifier}.blocks WHERE block_num <= {end_block:Nullable(UInt32)} ORDER BY block_num DESC LIMIT 1), (SELECT ts FROM max_ts))
    ) AS ts
),
clamped_start_ts AS (
    SELECT if(
        (SELECT n FROM active_filters) > 0 OR isNotNull({start_time:Nullable(UInt64)}) OR isNotNull({start_block:Nullable(UInt32)}),
        (SELECT ts FROM start_ts),
        greatest((SELECT ts FROM start_ts), (SELECT ts FROM end_ts) - INTERVAL 10 MINUTE)
    ) AS ts
),
/* 3) Intersect: keep only buckets present in ALL active filters, bounded by requested time/block window */
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
    WHERE
            ((SELECT n FROM active_filters) = 0 OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes))

        /* Primary-key pruning via unified timestamp bounds from start_ts/end_ts CTEs */
        AND timestamp >= (SELECT ts FROM clamped_start_ts)
        AND timestamp <= (SELECT ts FROM end_ts)

        /* Fine-grained block_num exclusion — only rows on the exact boundary second are checked */
        AND NOT (isNotNull({start_block:Nullable(UInt32)}) AND timestamp = (SELECT ts FROM clamped_start_ts) AND block_num < {start_block:Nullable(UInt32)})
        AND NOT (isNotNull({end_block:Nullable(UInt32)})   AND timestamp = (SELECT ts FROM end_ts)           AND block_num > {end_block:Nullable(UInt32)})

        /* Apply filters on non-indexed columns */
        AND (empty({signature:Array(String)})     OR signature      IN {signature:Array(String)})
        AND (empty({amm:Array(String)})           OR amm            IN {amm:Array(String)})
        AND (empty({amm_pool:Array(String)})      OR amm_pool       IN {amm_pool:Array(String)})
        AND (empty({user:Array(String)})          OR user           IN {user:Array(String)})
        AND (empty({input_mint:Array(String)})    OR input_mint     IN {input_mint:Array(String)})
        AND (empty({output_mint:Array(String)})   OR output_mint    IN {output_mint:Array(String)})
        AND (empty({program_id:Array(String)})    OR program_id     IN {program_id:Array(String)})
    ORDER BY timestamp DESC, block_num DESC
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
ORDER BY timestamp DESC, block_num DESC
