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

        /* Timestamp filters (ORDER BY timestamp = efficient primary key pruning) */
        AND (isNull({start_time:Nullable(UInt64)}) OR timestamp >= toDateTime({start_time:Nullable(UInt64)}))
        AND (isNull({end_time:Nullable(UInt64)}) OR timestamp <= toDateTime({end_time:Nullable(UInt64)}))

        /* Block filters using `blocks` table for efficient pruning (ORDER BY block_num = instant lookup) */
        AND (isNull({start_block:Nullable(UInt32)}) OR timestamp >= (SELECT timestamp FROM {db_dex:Identifier}.blocks WHERE block_num >= {start_block:Nullable(UInt32)} ORDER BY block_num DESC LIMIT 1))
        AND (isNull({end_block:Nullable(UInt32)}) OR timestamp <= (SELECT timestamp FROM {db_dex:Identifier}.blocks WHERE block_num <= {end_block:Nullable(UInt32)} ORDER BY block_num DESC LIMIT 1))

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
