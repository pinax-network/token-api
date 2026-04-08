WITH ohlc AS (
    SELECT
        /* Time */
        p.timestamp AS datetime,

        /* DEX identity */
        p.program_id AS program_id,
        p.amm AS amm,
        p.amm_pool AS amm_pool,
        p.mint0 AS mint0,
        p.mint1 AS mint1,

        /* OHLC */

        pow(10, coalesce(d1.decimals, 1) - coalesce(d0.decimals, 1)) AS price_multiplier,
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
        gross_volume0 / pow(10, coalesce(d0.decimals, 1)) AS volume,

        /* Universal */
        transactions,

        /* extra fields */
        p.mint0 IN {stablecoin_contracts: Array(String)} AS is_stablecoin
    FROM {db_dex:Identifier}.ohlc_prices p
    LEFT JOIN {db_accounts:Identifier}.decimals_state AS d0 ON p.mint0 = d0.mint
    LEFT JOIN {db_accounts:Identifier}.decimals_state AS d1 ON p.mint1 = d1.mint
    WHERE
            p.interval_min = {interval: UInt64}
        AND p.amm_pool = {amm_pool: String}
        AND (isNull({start_time:Nullable(UInt64)}) OR p.timestamp >= toDateTime({start_time:Nullable(UInt64)}))
        AND (isNull({end_time:Nullable(UInt64)}) OR p.timestamp <= toDateTime({end_time:Nullable(UInt64)}))
    ORDER BY datetime DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    /* Time */
    datetime,

    /* DEX identity */
    CONCAT(m0.symbol, m1.symbol) AS ticker,
    o.program_id AS program_id,
    o.amm AS amm,
    o.amm_pool AS amm_pool,

    /* OHLC */
    if(is_stablecoin, 1/open_raw, open_raw) AS open,
    if(is_stablecoin, 1/low_raw, high_raw) AS high,
    if(is_stablecoin, 1/high_raw, low_raw) AS low,
    if(is_stablecoin, 1/close_raw, close_raw) AS close,
    volume,
    transactions,

    /* Network */
    {network: String} AS network
FROM ohlc o
LEFT JOIN {db_metadata:Identifier}.metadata_mint_state AS mm0 ON o.mint0 = mm0.mint
LEFT JOIN {db_metadata:Identifier}.metadata_mint_state AS mm1 ON o.mint1 = mm1.mint
LEFT JOIN {db_metadata:Identifier}.metadata_view AS m0 ON mm0.metadata = m0.metadata
LEFT JOIN {db_metadata:Identifier}.metadata_view AS m1 ON mm1.metadata = m1.metadata
