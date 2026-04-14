WITH ohlc_prices AS (
    SELECT
        /* bar interval */
        timestamp,
        interval_min,

        /* timestamp & block number */
        min(min_timestamp) as min_timestamp,
        max(max_timestamp) as max_timestamp,
        min(min_block_num) as min_block_num,
        max(max_block_num) as max_block_num,

        /* DEX identity */
        program_id,
        amm,
        amm_pool,

        /* Aggregate */
        argMinMerge(open0) AS open0,
        quantileDeterministicMerge(0.95)(quantile0) as high_quantile0,
        quantileDeterministicMerge(0.05)(quantile0) as low_quantile0,
        argMaxMerge(close0) AS close0,

        /* volume */
        sum(gross_volume0) AS gross_volume0,
        sum(gross_volume1) AS gross_volume1,
        sum(net_flow0) AS net_flow0,
        sum(net_flow1) AS net_flow1,

        /* universal */
        sum(transactions) as transactions
    FROM {db_dex:Identifier}.state_ohlc_prices
    GROUP BY
        interval_min,
        program_id, amm, amm_pool,
        timestamp
)
SELECT
    /* Time */
    o.timestamp AS datetime,

    /* DEX identity */
    program_id,
    amm,
    amm_pool,

    /* OHLC */
    o.open0 AS open,
    greatest(
        o.high_quantile0,
        o.open0,
        o.close0
    ) AS high,
    least(
        o.low_quantile0,
        o.open0,
        o.close0
    ) AS low,
    o.close0 AS close,

    /* Volume */
    o.gross_volume0 AS volume,

    /* Universal */
    transactions
FROM ohlc_prices o
WHERE
        interval_min = {interval: UInt64}
    AND amm_pool = {amm_pool: String}
    AND (isNull({start_time:Nullable(UInt64)}) OR timestamp >= toDateTime({start_time:Nullable(UInt64)}))
    AND (isNull({end_time:Nullable(UInt64)}) OR timestamp <= toDateTime({end_time:Nullable(UInt64)}))
ORDER BY timestamp DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}
