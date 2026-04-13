WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8(notEmpty({signature:Array(String)})) +
        toUInt8(notEmpty({amm:Array(String)})) +
        toUInt8(notEmpty({amm_pool:Array(String)})) +
        toUInt8(notEmpty({input_mint:Array(String)})) +
        toUInt8(notEmpty({output_mint:Array(String)})) +
        toUInt8(notEmpty({user:Array(String)})) +
        toUInt8(notEmpty({program_id:Array(String)})) +
        toUInt8(notEmpty({fee_payer:Array(String)})) +
        toUInt8(notEmpty({signer:Array(String)}))
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({amm:Array(String)}) AND amm IN {amm:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({amm_pool:Array(String)}) AND amm_pool IN {amm_pool:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({program_id:Array(String)}) AND program_id IN {program_id:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({input_mint:Array(String)}) AND input_mint IN {input_mint:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({output_mint:Array(String)}) AND output_mint IN {output_mint:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({user:Array(String)}) AND user IN {user:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({signature:Array(String)}) AND signature IN {signature:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({fee_payer:Array(String)}) AND fee_payer IN {fee_payer:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (isNotNull({protocol:Nullable(String)}) AND protocol = {protocol:Nullable(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({signer:Array(String)}) AND signer IN {signer:Array(String)})
    GROUP BY minute
),
/*
    Unified timestamp resolution for start_time/end_time and start_block/end_block.
    Uses coalesce instead of `isNull(X) OR timestamp >= (subquery)` because
    the OR pattern prevents ClickHouse from recognizing a clean primary-key range.
    greatest/least picks the tighter bound when both are provided.
    clamped_start_ts ensures the scan window is at most 1 hour wide when no filters are provided.
*/
start_ts AS (
    SELECT greatest(
        coalesce(toDateTime({start_time:Nullable(UInt64)}), toDateTime(0)),
        coalesce((SELECT timestamp FROM {db_dex:Identifier}.blocks WHERE block_num >= {start_block:Nullable(UInt64)} ORDER BY block_num ASC LIMIT 1), toDateTime(0))
    ) AS ts
),
end_ts AS (
    SELECT least(
        coalesce(toDateTime({end_time:Nullable(UInt64)}), now()),
        coalesce((SELECT timestamp FROM {db_dex:Identifier}.blocks WHERE block_num <= {end_block:Nullable(UInt64)} ORDER BY block_num DESC LIMIT 1), now())
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
filtered_swaps AS
(
    SELECT
        block_num,
        timestamp,
        signature,
        transaction_index,
        instruction_index,
        stack_height,
        user,
        amm,
        amm_pool,
        signer,
        signers,
        fee_payer,
        program_id,
        input_mint,
        output_mint,
        input_amount,
        output_amount,
        fee,
        protocol,
        compute_units_consumed
    FROM {db_dex:Identifier}.swaps t
    WHERE
            ((SELECT n FROM active_filters) = 0 OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes))

        /* Primary-key pruning via unified timestamp bounds from start_ts/end_ts/clamped_start_ts CTEs */
        AND timestamp >= (SELECT ts FROM clamped_start_ts)
        AND timestamp <= (SELECT ts FROM end_ts)

        /* Fine-grained block_num exclusion — only rows on the exact boundary second are checked */
        AND NOT (isNotNull({start_block:Nullable(UInt32)}) AND timestamp = (SELECT ts FROM clamped_start_ts) AND block_num < {start_block:Nullable(UInt32)})
        AND NOT (isNotNull({end_block:Nullable(UInt32)})   AND timestamp = (SELECT ts FROM end_ts)           AND block_num > {end_block:Nullable(UInt32)})

        /* Apply filters */
        AND (empty({signature:Array(String)}) OR signature IN {signature:Array(String)})
        AND (empty({program_id:Array(String)}) OR program_id IN {program_id:Array(String)})
        AND (empty({input_mint:Array(String)}) OR input_mint IN {input_mint:Array(String)})
        AND (empty({output_mint:Array(String)}) OR output_mint IN {output_mint:Array(String)})
        AND (empty({user:Array(String)}) OR user IN {user:Array(String)})
        AND (empty({amm:Array(String)}) OR amm IN {amm:Array(String)})
        AND (empty({amm_pool:Array(String)}) OR amm_pool IN {amm_pool:Array(String)})
        AND (empty({fee_payer:Array(String)}) OR fee_payer IN {fee_payer:Array(String)})
        AND (empty({signer:Array(String)}) OR signer IN {signer:Array(String)})
        AND (isNull({protocol:Nullable(String)}) OR protocol = {protocol:Nullable(String)})
    ORDER BY timestamp DESC, block_num DESC, transaction_index DESC, instruction_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
mints_raw AS (
    SELECT input_mint AS account, input_mint AS mint FROM filtered_swaps
    UNION DISTINCT
    SELECT output_mint AS account, output_mint AS mint FROM filtered_swaps
),
account_mint_state AS (
    SELECT account, mint
    FROM {db_accounts:Identifier}.account_mint_state
    WHERE account IN (SELECT account FROM mints_raw)
),
mints AS (
    SELECT account, mint FROM mints_raw
    UNION DISTINCT
    SELECT account, mint FROM account_mint_state
),
resolved_swaps AS (
    SELECT
        s.*,
        coalesce(ai.mint, s.input_mint) AS resolved_input_mint,
        coalesce(ao.mint, s.output_mint) AS resolved_output_mint
    FROM filtered_swaps AS s
    LEFT JOIN account_mint_state AS ai ON s.input_mint = ai.account
    LEFT JOIN account_mint_state AS ao ON s.output_mint = ao.account
),
metadata_mint_state AS (
    SELECT mint, metadata
    FROM {db_metadata:Identifier}.metadata_mint_state
    WHERE mint IN (SELECT mint FROM mints)
),
decimals_state AS (
    SELECT mint, decimals
    FROM {db_accounts:Identifier}.decimals_state FINAL
    WHERE mint IN (SELECT mint FROM mints)
),
metadata_name_state AS (
    SELECT metadata, name
    FROM {db_metadata:Identifier}.metadata_name_state FINAL
    WHERE metadata IN (SELECT metadata FROM metadata_mint_state)
),
metadata_symbol_state AS (
    SELECT metadata, symbol
    FROM {db_metadata:Identifier}.metadata_symbol_state FINAL
    WHERE metadata IN (SELECT metadata FROM metadata_mint_state)
),
metadata_state AS (
    SELECT
        mm.mint,
        mm.metadata as metadata,
        n.name,
        s.symbol
    FROM metadata_mint_state AS mm
    LEFT JOIN metadata_name_state AS n ON mm.metadata = n.metadata
    LEFT JOIN metadata_symbol_state AS s ON mm.metadata = s.metadata
)
SELECT
    /* block */
    block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,

    /* transaction */
    signature,
    transaction_index,
    instruction_index,
    stack_height,
    fee_payer,
    signer,
    signers,

    /* fee */
    fee,
    compute_units_consumed,

    /* instruction */
    program_id,
    program_names(program_id) AS program_name,

    /* swap */
    amm,
    amm_pool,
    user,

    /* tokens */
    CAST ((
        resolved_input_mint,
        m1.symbol,
        d1.decimals
    ) AS Tuple(mint String, symbol String, decimals UInt8)) AS input_token,
    CAST ((
        resolved_output_mint,
        m2.symbol,
        d2.decimals
    ) AS Tuple(mint String, symbol String, decimals UInt8)) AS output_token,

    /* input */
    s.input_mint AS input_mint,
    input_amount,
    input_amount / pow(10, coalesce(d1.decimals, 0)) AS input_value,

    /* output */
    s.output_mint AS output_mint,
    output_amount,
    output_amount / pow(10, coalesce(d2.decimals, 0)) AS output_value,

    /* prices */
    s.protocol AS protocol,

    /* network */
    {network:String} AS network
FROM resolved_swaps AS s
LEFT JOIN decimals_state AS d1 ON s.resolved_input_mint = d1.mint
LEFT JOIN decimals_state AS d2 ON s.resolved_output_mint = d2.mint
LEFT JOIN metadata_state AS m1 ON s.resolved_input_mint = m1.mint
LEFT JOIN metadata_state AS m2 ON s.resolved_output_mint = m2.mint
ORDER BY timestamp DESC, block_num DESC, transaction_index DESC, instruction_index DESC
