WITH ohlc AS (
    SELECT
        /* Time */
        timestamp AS datetime,

        /* DEX identity */
        CONCAT(m0.symbol, m1.symbol) AS ticker,
        pool,

        /* OHLC */
        pow(10, m1.decimals - m0.decimals) AS price_multiplier,
        open0 / price_multiplier AS open_raw,
        greatest(
            high_quantile0,
            open0,
            close0
        ) / price_multiplier AS high_raw,
        least(
            low_quantile0,
            open0,
            close0
        ) / price_multiplier AS low_raw,
        close0 / price_multiplier AS close_raw,

        /* Volume */
        gross_volume0 / pow(10, m0.decimals) AS volume,

        /* Universal */
        uniq_tx_from AS uaw,
        transactions,

        /* extra fields */
        p.token0 IN {stablecoin_contracts: Array(String)} AS is_stablecoin
    FROM {db_dex:Identifier}.ohlc_prices p
    LEFT JOIN metadata.metadata m0 ON {network: String} = m0.network AND p.token0 = m0.contract
    LEFT JOIN metadata.metadata m1 ON {network: String} = m1.network AND p.token1 = m1.contract
    WHERE
            p.interval_min = {interval: UInt64}
        AND p.pool = {pool: String}
        AND ({start_time: UInt64} == 1763251200 OR timestamp >= toDateTime({start_time: UInt64}))
        AND ({end_time: UInt64} == 2524608000 OR timestamp <= toDateTime({end_time: UInt64}))
    ORDER BY datetime DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    /* Time */
    datetime,

    /* DEX identity */
    ticker,
    pool,

    /* OHLC */
    if(is_stablecoin, 1/open_raw, open_raw) AS open,
    if(is_stablecoin, 1/low_raw, high_raw) AS high,
    if(is_stablecoin, 1/high_raw, low_raw) AS low,
    if(is_stablecoin, 1/close_raw, close_raw) AS close,
    volume,
    uaw,
    transactions,

    /* Network */
    {network: String} AS network
FROM ohlc
