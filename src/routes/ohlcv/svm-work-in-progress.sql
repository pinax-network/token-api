WITH accounts AS (
    SELECT mint
    FROM {db_dex:Identifier}.state_pools_aggregating_by_mint
    WHERE amm_pool = {amm_pool:String}
    GROUP BY amm_pool, mint
),
account_mint AS (
    SELECT account, mint
    FROM {db_accounts:Identifier}.account_mint_refresh
    WHERE account IN accounts
),
mints AS (
    SELECT DISTINCT mint FROM (SELECT mint FROM account_mint LIMIT 100)
)
SELECT
    /* Time */
    o.timestamp AS datetime,

    /* DEX identity */
    program_id,
    amm,
    amm_pool,
    coalesce(a0.mint, o.mint0) AS mint0,
    coalesce(a1.mint, o.mint1) AS mint1,

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
FROM {db_dex:Identifier}.ohlc_prices o
LEFT JOIN account_mint a0 ON o.mint0 = a0.account
LEFT JOIN account_mint a1 ON o.mint1 = a1.account
WHERE
        interval_min = {interval: UInt64}
    AND amm_pool = {amm_pool: String}
    AND (isNull({start_time:Nullable(UInt64)}) OR timestamp >= toDateTime({start_time:Nullable(UInt64)}))
    AND (isNull({end_time:Nullable(UInt64)}) OR timestamp <= toDateTime({end_time:Nullable(UInt64)}))
ORDER BY timestamp DESC
LIMIT {limit: UInt64}
OFFSET {offset: UInt64};