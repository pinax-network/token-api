WITH
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
        coalesce((SELECT timestamp FROM {db_transfers:Identifier}.blocks WHERE block_num >= {start_block:Nullable(UInt32)} ORDER BY block_num ASC LIMIT 1), toDateTime(0))
    ) AS ts
),
end_ts AS (
    SELECT least(
        coalesce(toDateTime({end_time:Nullable(UInt64)}), now()),
        coalesce((SELECT timestamp FROM {db_transfers:Identifier}.blocks WHERE block_num <= {end_block:Nullable(UInt32)} ORDER BY block_num DESC LIMIT 1), now())
    ) AS ts
),
has_filters AS (
    SELECT (
        notEmpty({signature:Array(String)}) OR
        notEmpty({source:Array(String)}) OR
        notEmpty({destination:Array(String)}) OR
        notEmpty({authority:Array(String)}) OR
        notEmpty({mint:Array(String)}) OR
        isNotNull({start_time:Nullable(UInt64)}) OR
        isNotNull({start_block:Nullable(UInt32)})
    ) AS has_filter
),
clamped_start_ts AS (
    SELECT if(
        (SELECT has_filter FROM has_filters),
        (SELECT ts FROM start_ts),
        greatest((SELECT ts FROM start_ts), (SELECT ts FROM end_ts) - INTERVAL 1 HOUR)
    ) AS ts
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
        amount /
        CASE
            WHEN decimals IS NOT NULL THEN pow(10, decimals)
            ELSE 1
        END AS value
    FROM {db_transfers:Identifier}.transfers t
    WHERE
        /* Primary-key pruning via unified timestamp bounds from start_ts/end_ts CTEs */
        timestamp >= (SELECT ts FROM clamped_start_ts)
        AND timestamp <= (SELECT ts FROM end_ts)

        /* Fine-grained block_num exclusion — only rows on the exact boundary second are checked */
        AND NOT (isNotNull({start_block:Nullable(UInt32)}) AND timestamp = (SELECT ts FROM clamped_start_ts) AND block_num < {start_block:Nullable(UInt32)})
        AND NOT (isNotNull({end_block:Nullable(UInt32)})   AND timestamp = (SELECT ts FROM end_ts)           AND block_num > {end_block:Nullable(UInt32)})

        /* Apply filters */
        AND (empty({signature:Array(String)}) OR signature IN {signature:Array(String)})
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
