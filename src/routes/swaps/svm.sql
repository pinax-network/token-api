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
/* Only skip the 10-minute safety clamp when the caller has provided BOTH
   narrowing filters AND an explicit lower bound (start_time or start_block).
   Without a lower bound, start_ts = epoch → ClickHouse scans the entire table.
   Filters alone (e.g. amm_pool) don't help with primary-key pruning — they only
   narrow individual rows AFTER the timestamp range is scanned. */
has_filters AS (
    SELECT (
        notEmpty({signature:Array(String)}) OR notEmpty({amm:Array(String)})
        OR notEmpty({amm_pool:Array(String)}) OR notEmpty({user:Array(String)})
        OR notEmpty({input_mint:Array(String)}) OR notEmpty({output_mint:Array(String)})
        OR notEmpty({program_id:Array(String)})
    ) AS yes
),
has_explicit_start AS (
    SELECT (isNotNull({start_time:Nullable(UInt64)}) OR isNotNull({start_block:Nullable(UInt32)})) AS yes
),
clamped_start_ts AS (
    SELECT if(
        (SELECT yes FROM has_filters) OR (SELECT yes FROM has_explicit_start),
        (SELECT ts FROM start_ts),
        greatest((SELECT ts FROM start_ts), (SELECT ts FROM end_ts) - INTERVAL 1 HOUR)
    ) AS ts
)
SELECT
    block_num,
    timestamp,
    transaction_index,
    instruction_index,
    toString(signature) AS signature,
    toString(program_id) AS program_id,
    toString(program_names(program_id)) AS program_name,
    toString(amm) AS amm,
    toString(amm_pool) AS amm_pool,
    toString(user) AS user,
    toString(input_mint) AS input_mint,
    input_amount,
    toString(output_mint) AS output_mint,
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
    AND (empty({signature:Array(String)})   OR signature IN {signature:Array(String)})
    AND (empty({amm:Array(String)})         OR amm IN {amm:Array(String)})
    AND (empty({amm_pool:Array(String)})    OR amm_pool IN {amm_pool:Array(String)})
    AND (empty({user:Array(String)})        OR user IN {user:Array(String)})
    AND (empty({input_mint:Array(String)})  OR input_mint IN {input_mint:Array(String)})
    AND (empty({output_mint:Array(String)}) OR output_mint IN {output_mint:Array(String)})
    AND (empty({program_id:Array(String)})  OR program_id IN {program_id:Array(String)})
ORDER BY timestamp DESC, block_num DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}
