/*
    Unified timestamp resolution for both start_time/end_time and start_block/end_block.
    Uses coalesce instead of `isNull(X) OR timestamp >= (subquery)` because
    the OR pattern prevents ClickHouse from recognizing a clean primary-key range —
    it can't simplify the expression into a direct timestamp bound, causing a full scan.
    With coalesce, ClickHouse always sees `timestamp >= <value>` / `timestamp <= <value>`,
    enabling granule skipping on the primary index (timestamp is the leading key).
    When both params are NULL → falls back to epoch/now() → no-op bound.
    When both are provided, greatest/least picks the tighter bound.
*/
WITH
start_ts AS (
    SELECT greatest(
        coalesce(toDateTime({start_time:Nullable(UInt64)}), toDateTime(0)),
        coalesce((SELECT timestamp FROM {db_dex:Identifier}.blocks WHERE block_num >= {start_block:Nullable(UInt32)} ORDER BY block_num ASC LIMIT 1), toDateTime(0))
    ) AS ts
),
end_ts AS (
    SELECT least(
        coalesce(toDateTime({end_time:Nullable(UInt64)}), now()),
        coalesce((SELECT timestamp FROM {db_dex:Identifier}.blocks WHERE block_num <= {end_block:Nullable(UInt32)} ORDER BY block_num DESC LIMIT 1), now())
    ) AS ts
),
/* When no lower bound is provided, start_ts = epoch → ClickHouse scans the entire table.
   Clamp to end_ts minus 10 minutes so there's always a tight primary-key range. */
clamped_start_ts AS (
    SELECT if(
        (SELECT ts FROM start_ts) = toDateTime(0),
        (SELECT ts FROM end_ts) - INTERVAL 10 MINUTE,
        (SELECT ts FROM start_ts)
    ) AS ts
)
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
    /* Primary-key pruning: ClickHouse skips granules instantly via the timestamp leading key.
       start_ts/end_ts already merge start_time, end_time, start_block and end_block into
       the tightest possible [lower, upper] range — this handles all non-boundary rows. */
        timestamp >= (SELECT ts FROM clamped_start_ts)
    AND timestamp <= (SELECT ts FROM end_ts)

    /* Fine-grained block_num exclusion — only rows sitting on the exact boundary second
       are checked. For all other rows `timestamp = start_ts` is false → NOT(false AND ...) = true
       → row passes instantly without touching block_num. */
    AND NOT (isNotNull({start_block:Nullable(UInt32)}) AND timestamp = (SELECT ts FROM clamped_start_ts) AND block_num < {start_block:Nullable(UInt32)})
    AND NOT (isNotNull({end_block:Nullable(UInt32)})   AND timestamp = (SELECT ts FROM end_ts)           AND block_num > {end_block:Nullable(UInt32)})
ORDER BY timestamp DESC, block_num DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}