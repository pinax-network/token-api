WITH
/* 1) Count how many filters are active */
active_filters AS
(
    SELECT
        toUInt8(notEmpty({transaction_id:Array(String)}))  +
        toUInt8(notEmpty({factory:Array(String)}))         +
        toUInt8(notEmpty({pool:Array(String)}))            +
        toUInt8(notEmpty({recipient:Array(String)}))       +
        toUInt8(notEmpty({sender:Array(String)}))          +
        toUInt8(notEmpty({caller:Array(String)}))          +
        toUInt8(notEmpty({input_contract:Array(String)}))  +
        toUInt8(notEmpty({output_contract:Array(String)})) +
        toUInt8(isNotNull({protocol:Nullable(String)}))
    AS n
),
/* 2) Union minutes from only active filters */
minutes_union AS
(
    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({transaction_id:Array(String)}) AND tx_hash IN {transaction_id:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({factory:Array(String)}) AND factory IN {factory:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({pool:Array(String)}) AND pool IN {pool:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({recipient:Array(String)}) AND user IN {recipient:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({sender:Array(String)}) AND tx_from IN {sender:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({caller:Array(String)}) AND tx_from IN {caller:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({input_contract:Array(String)}) AND input_contract IN {input_contract:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (notEmpty({output_contract:Array(String)}) AND output_contract IN {output_contract:Array(String)})
    GROUP BY minute

    UNION ALL

    SELECT minute
    FROM {db_dex:Identifier}.swaps
    WHERE (isNotNull({protocol:Nullable(String)}) AND protocol = replaceAll({protocol:Nullable(String)}, '_', '-'))
    GROUP BY minute
),
/* 3) Intersect: keep only buckets present in ALL active filters, bounded by requested time window */
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
        greatest((SELECT ts FROM start_ts), (SELECT ts FROM end_ts) - INTERVAL 10 MINUTE)
    ) AS ts
),
filtered_swaps AS
(
    SELECT *
    FROM {db_dex:Identifier}.swaps

    WHERE
            ((SELECT n FROM active_filters) = 0 OR minute IN (SELECT minute FROM filtered_minutes))

        /* Primary-key pruning via unified timestamp bounds from start_ts/end_ts CTEs */
        AND minute >= toRelativeMinuteNum((SELECT ts FROM clamped_start_ts))
        AND minute <= toRelativeMinuteNum((SELECT ts FROM end_ts))
        AND timestamp >= (SELECT ts FROM clamped_start_ts)
        AND timestamp <= (SELECT ts FROM end_ts)

        /* Fine-grained block_num exclusion — only rows on the exact boundary second are checked */
        AND NOT (isNotNull({start_block:Nullable(UInt64)}) AND timestamp = (SELECT ts FROM clamped_start_ts) AND block_num < {start_block:Nullable(UInt64)})
        AND NOT (isNotNull({end_block:Nullable(UInt64)})   AND timestamp = (SELECT ts FROM end_ts)           AND block_num > {end_block:Nullable(UInt64)})

        AND (empty({transaction_id:Array(String)})      OR tx_hash IN {transaction_id:Array(String)})
        AND (empty({factory:Array(String)})             OR factory IN {factory:Array(String)})
        AND (empty({pool:Array(String)})                OR pool IN {pool:Array(String)})
        AND (empty({recipient:Array(String)})           OR user IN {recipient:Array(String)})
        AND (empty({sender:Array(String)})              OR tx_from IN {sender:Array(String)})
        AND (empty({caller:Array(String)})              OR tx_from IN {caller:Array(String)})
        AND (empty({input_contract:Array(String)})      OR input_contract IN {input_contract:Array(String)})
        AND (empty({output_contract:Array(String)})     OR output_contract IN {output_contract:Array(String)})
        AND (isNull({protocol:Nullable(String)})        OR protocol = {protocol:Nullable(String)})
    ORDER BY minute DESC, timestamp DESC, block_num DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
contracts AS (
    SELECT DISTINCT input_contract AS contract FROM filtered_swaps
    UNION DISTINCT
    SELECT DISTINCT output_contract AS contract FROM filtered_swaps
),
contracts_metadata AS (
    SELECT
        network,
        contract,
        argMax(name, block_num) as name,
        argMax(symbol, block_num) as symbol,
        argMax(decimals, block_num) as decimals
    FROM metadata.metadata
    WHERE network = {network:String} AND contract IN (SELECT contract FROM contracts)
    GROUP BY network, contract
)
SELECT
    /* block */
    s.block_num AS block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,

    /* transaction */
    s.tx_hash AS transaction_id,
    /* s.log_ordinal AS ordinal, for `/v2` endpoint */

    /* swap */
    toString(s.factory) AS factory,
    s.pool AS pool,
    s.tx_from AS caller,
    s.tx_from AS sender,
    s.user AS recipient,

    /* tokens */
    CAST ((
        s.input_contract,
        m1.symbol,
        m1.decimals
    ) AS Tuple(address String, symbol String, decimals UInt8)) AS input_token,
    CAST ((
        s.output_contract,
        m2.symbol,
        m2.decimals
    ) AS Tuple(address String, symbol String, decimals UInt8)) AS output_token,

    /* amounts and prices */
    toString(s.input_amount) AS input_amount,
    s.input_amount / pow(10, m1.decimals) AS input_value,
    toString(s.output_amount) AS output_amount,
    s.output_amount / pow(10, m2.decimals) AS output_value,
    if(s.input_amount > 0, (s.output_amount / pow(10, m2.decimals)) / (s.input_amount / pow(10, m1.decimals)), 0) AS price,
    if(s.output_amount > 0, (s.input_amount / pow(10, m1.decimals)) / (s.output_amount / pow(10, m2.decimals)), 0) AS price_inv,
    s.protocol AS protocol,

    /* summary */
    format('Swap {} {} for {} {} on {}',
        if(s.input_amount / pow(10, m1.decimals) > 1000, formatReadableQuantity(s.input_amount / pow(10, m1.decimals)), toString(s.input_amount / pow(10, m1.decimals))),
        m1.symbol,
        if(s.output_amount / pow(10, m2.decimals) > 1000, formatReadableQuantity(s.output_amount / pow(10, m2.decimals)), toString(s.output_amount / pow(10, m2.decimals))),
        m2.symbol,
        arrayStringConcat(
            arrayMap(x -> concat(upper(substring(x, 1, 1)), substring(x, 2)),
                     splitByChar('_', toString(s.protocol))),
            ' '
        )
    ) AS summary,

    /* network */
    {network:String} AS network
FROM filtered_swaps AS s
LEFT JOIN contracts_metadata AS m1 ON s.input_contract = m1.contract
LEFT JOIN contracts_metadata AS m2 ON s.output_contract = m2.contract
ORDER BY minute DESC, timestamp DESC, block_num DESC
