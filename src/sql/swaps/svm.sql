WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8({signature:Array(String)}    != ['']) +
        toUInt8({amm:Array(String)}          != ['']) +
        toUInt8({amm_pool:Array(String)}     != ['']) +
        toUInt8({user:Array(String)}         != ['']) +
        toUInt8({input_mint:Array(String)}   != ['']) +
        toUInt8({output_mint:Array(String)}  != ['']) +
        toUInt8({program_id:Array(String)}   != [''])
    AS n
),
/* 2) Union buckets from only active filters */
minutes_union AS
(
    SELECT minute
    FROM swaps_by_signature
    WHERE ({signature:Array(String)} != [''] AND signature IN {signature:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_amm
    WHERE ({amm:Array(String)} != [''] AND amm IN {amm:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_amm_pool
    WHERE ({amm_pool:Array(String)} != [''] AND amm_pool IN {amm_pool:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_user
    WHERE ({user:Array(String)} != [''] AND user IN {user:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_input_mint
    WHERE ({input_mint:Array(String)} != [''] AND input_mint IN {input_mint:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_output_mint
    WHERE ({output_mint:Array(String)} != [''] AND output_mint IN {output_mint:Array(String)})
    ORDER BY minute DESC

    UNION ALL

    SELECT minute
    FROM swaps_by_program_id
    WHERE ({program_id:Array(String)} != [''] AND program_id IN {program_id:Array(String)})
    ORDER BY minute DESC
),
/* 3) Intersect: keep only buckets present in ALL active filters */
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
        toUInt64({limit:UInt64}) + toUInt64({offset:UInt64}),
        (toUInt64({limit:UInt64}) + toUInt64({offset:UInt64})) * 10
    )
),
/* Latest ingested timestamp in source table */
latest_ts AS
(
    SELECT max(timestamp) AS ts FROM swaps
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
    FROM swaps s
    PREWHERE
        timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND (
            (
                (SELECT n FROM active_filters) = 0
                AND timestamp BETWEEN
                    greatest( toDateTime({start_time:UInt64}), least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts)) - (INTERVAL 10 MINUTE + INTERVAL 1 * {offset:UInt64} SECOND))
                    AND least(toDateTime({end_time:UInt64}), (SELECT ts FROM latest_ts))
            )
            OR toRelativeMinuteNum(timestamp) IN (SELECT minute FROM filtered_minutes)
        )
    WHERE
        ({signature:Array(String)}     = [''] OR signature      IN {signature:Array(String)})
        AND ({amm:Array(String)}           = [''] OR amm            IN {amm:Array(String)})
        AND ({amm_pool:Array(String)}      = [''] OR amm_pool       IN {amm_pool:Array(String)})
        AND ({user:Array(String)}          = [''] OR user           IN {user:Array(String)})
        AND ({input_mint:Array(String)}    = [''] OR input_mint     IN {input_mint:Array(String)})
        AND ({output_mint:Array(String)}   = [''] OR output_mint    IN {output_mint:Array(String)})
        AND ({program_id:Array(String)}    = [''] OR program_id     IN {program_id:Array(String)})
    ORDER BY timestamp DESC, transaction_index DESC, instruction_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
/* Pre-fetch only the mints we need */
unique_mints AS (
    SELECT DISTINCT input_mint AS mint FROM filtered_swaps
    UNION DISTINCT
    SELECT DISTINCT output_mint AS mint FROM filtered_swaps
),
/* Batch lookup decimals */
decimals_lookup AS (
    SELECT mint, decimals
    FROM {db_svm_metadata:Identifier}.decimals_state
    WHERE mint IN (SELECT mint FROM unique_mints)
),
/* Batch lookup symbols (mint -> metadata -> symbol) */
symbols_lookup AS (
    SELECT m.mint, s.symbol
    FROM {db_svm_metadata:Identifier}.metadata_mint_state AS m
    INNER JOIN {db_svm_metadata:Identifier}.metadata_symbol_state AS s ON m.metadata = s.metadata
    WHERE m.mint IN (SELECT mint FROM unique_mints)
),
/* Build token tuples */
tokens_lookup AS (
    SELECT
        d.mint,
        CAST(
            (
                d.mint,
                coalesce(s.symbol, ''),
                coalesce(d.decimals, 0)
            ) AS Tuple(mint String, symbol String, decimals UInt8)
        ) AS token
    FROM decimals_lookup d
    LEFT JOIN symbols_lookup s ON d.mint = s.mint
)
SELECT
    s.block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,
    toString(s.signature) AS signature,
    s.transaction_index,
    s.instruction_index,
    toString(s.program_id) AS program_id,
    s.program_name,
    toString(s.amm) AS amm,
    toString(s.amm_pool) AS amm_pool,
    toString(s.user) AS user,
    coalesce(it.token, CAST((toString(s.input_mint), '', 0) AS Tuple(mint String, symbol String, decimals UInt8))) AS input_mint,
    toString(s.input_amount) AS input_amount,
    s.input_amount / pow(10, coalesce(it.token.decimals, 0)) AS input_value,
    coalesce(ot.token, CAST((toString(s.output_mint), '', 0) AS Tuple(mint String, symbol String, decimals UInt8))) AS output_mint,
    toString(s.output_amount) AS output_amount,
    s.output_amount / pow(10, coalesce(ot.token.decimals, 0)) AS output_value,
    if(s.input_amount > 0,
        (s.output_amount / pow(10, coalesce(ot.token.decimals, 0))) / (s.input_amount / pow(10, coalesce(it.token.decimals, 0))),
        0
    ) AS price,
    if(s.output_amount > 0,
        (s.input_amount / pow(10, coalesce(it.token.decimals, 0))) / (s.output_amount / pow(10, coalesce(ot.token.decimals, 0))),
        0
    ) AS price_inv,
    format('Swap {} {} for {} {} on {}',
        if(s.input_amount / pow(10, coalesce(it.token.decimals, 0)) > 1000,
            formatReadableQuantity(s.input_amount / pow(10, coalesce(it.token.decimals, 0))),
            toString(round(s.input_amount / pow(10, coalesce(it.token.decimals, 0)), coalesce(it.token.decimals, 0)))
        ),
        coalesce(it.token.symbol, 'Unknown'),
        if(s.output_amount / pow(10, coalesce(ot.token.decimals, 0)) > 1000,
            formatReadableQuantity(s.output_amount / pow(10, coalesce(ot.token.decimals, 0))),
            toString(round(s.output_amount / pow(10, coalesce(ot.token.decimals, 0)), coalesce(ot.token.decimals, 0)))
        ),
        coalesce(ot.token.symbol, 'Unknown'),
        s.program_name
    ) AS summary,
    {network:String} AS network
FROM filtered_swaps AS s
LEFT JOIN tokens_lookup AS it ON s.input_mint = it.mint
LEFT JOIN tokens_lookup AS ot ON s.output_mint = ot.mint
ORDER BY s.timestamp DESC, s.transaction_index DESC, s.instruction_index DESC