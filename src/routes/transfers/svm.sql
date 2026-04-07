WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8(notEmpty({signature:Array(String)})) +
        toUInt8(notEmpty({source:Array(String)})) +
        toUInt8(notEmpty({destination:Array(String)})) +
        toUInt8(notEmpty({mint:Array(String)})) +
        toUInt8(notEmpty({authority:Array(String)})) +
        toUInt8(notEmpty({program_id:Array(String)})) +
        toUInt8(notEmpty({fee_payer:Array(String)})) +
        toUInt8(notEmpty({signer:Array(String)}))
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE (notEmpty({source:Array(String)}) AND source IN {source:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE (notEmpty({destination:Array(String)}) AND destination IN {destination:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE (notEmpty({program_id:Array(String)}) AND program_id IN {program_id:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE (notEmpty({mint:Array(String)}) AND mint IN {mint:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE (notEmpty({signature:Array(String)}) AND signature IN {signature:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
    WHERE (notEmpty({fee_payer:Array(String)}) AND fee_payer IN {fee_payer:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_transfers:Identifier}.transfers
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
    SELECT
        block_num,
        timestamp,
        signature,
        transaction_index,
        instruction_index,
        authority,
        multisig_authority,
        stack_height,
        source,
        destination,
        fee_payer,
        program_id,
        mint,
        decimals,
        signer,
        signers,
        amount,
        fee,
        compute_units_consumed
    FROM {db_transfers:Identifier}.transfers t
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
        AND (empty({source:Array(String)}) OR source IN {source:Array(String)})
        AND (empty({destination:Array(String)}) OR destination IN {destination:Array(String)})
        AND (empty({authority:Array(String)}) OR authority IN {authority:Array(String)})
        AND (empty({program_id:Array(String)}) OR program_id IN {program_id:Array(String)})
        AND (empty({mint:Array(String)}) OR mint IN {mint:Array(String)})
        AND (empty({fee_payer:Array(String)}) OR fee_payer IN {fee_payer:Array(String)})
        AND (empty({signer:Array(String)}) OR signer IN {signer:Array(String)})
    ORDER BY timestamp DESC, block_num DESC, transaction_index DESC, instruction_index DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
mints AS
(
    SELECT DISTINCT mint FROM filtered_transfers
),
spl_metadata AS
(
    SELECT
        'So11111111111111111111111111111111111111112' AS mint,
        'Wrapped SOL' AS name,
        'WSOL' AS symbol,
        '' AS uri

    UNION ALL

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
            WHERE mint IN (SELECT mint FROM mints)
            GROUP BY metadata
        )
    )
    WHERE (SELECT count() FROM mints) > 0
)
SELECT
    block_num,
    t.timestamp AS datetime,
    toUnixTimestamp(t.timestamp) AS timestamp,
    signature,
    transaction_index,
    instruction_index,
    stack_height,
    program_id,
    mint,
    authority,
    multisig_authority,
    signer,
    signers,
    source,
    destination,
    fee_payer,
    toString(t.amount) AS amount,
    t.amount /
        CASE
            WHEN t.decimals IS NOT NULL THEN pow(10, t.decimals)
            ELSE 1
        END AS value,
    t.decimals AS decimals,
    m.name AS name,
    m.symbol AS symbol,
    fee,
    compute_units_consumed,
    {network:String} AS network
FROM filtered_transfers AS t
LEFT JOIN spl_metadata AS m USING mint
ORDER BY timestamp DESC, block_num DESC, transaction_index DESC, instruction_index DESC
