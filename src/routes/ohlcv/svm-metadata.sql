WITH base_ohlc AS (
    SELECT
        p.timestamp AS datetime,
        p.program_id AS program_id,
        p.amm AS amm,
        p.amm_pool AS amm_pool,
        p.mint0 AS mint0,
        p.mint1 AS mint1,
        p.open0 AS open0,
        p.high_quantile0 AS high_quantile0,
        p.low_quantile0 AS low_quantile0,
        p.close0 AS close0,
        p.gross_volume0 AS gross_volume0,
        p.transactions AS transactions
    FROM {db_dex:Identifier}.ohlc_prices p
    WHERE
            p.interval_min = {interval: UInt64}
        AND p.amm_pool = {amm_pool: String}
        AND (isNull({start_time:Nullable(UInt64)}) OR p.timestamp >= toDateTime({start_time:Nullable(UInt64)}))
        AND (isNull({end_time:Nullable(UInt64)}) OR p.timestamp <= toDateTime({end_time:Nullable(UInt64)}))
    ORDER BY datetime DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
mints_raw AS (
    SELECT DISTINCT mint0 AS mint FROM base_ohlc
    UNION DISTINCT
    SELECT DISTINCT mint1 AS mint FROM base_ohlc
),
account_mint_state AS (
    SELECT DISTINCT mint
    FROM {db_accounts:Identifier}.account_mint_state
    WHERE account IN (SELECT mint FROM mints_raw)
),
mints AS (
    SELECT DISTINCT mint FROM account_mint_state
    WHERE notEmpty(mint)
    UNION DISTINCT
    SELECT DISTINCT mint FROM mints_raw
    WHERE notEmpty(mint)
),
metadata_mint_state AS (
    SELECT mint, metadata
    FROM {db_metadata:Identifier}.metadata_mint_state
    WHERE mint IN (SELECT mint FROM mints)
),
decimals_state AS (
    SELECT mint, decimals
    FROM {db_accounts:Identifier}.decimals_state FINAL
    WHERE mint IN (SELECT mint FROM mints)
),
metadata_name_state AS (
    SELECT metadata, name
    FROM {db_metadata:Identifier}.metadata_name_state FINAL
    WHERE metadata IN (SELECT metadata FROM metadata_mint_state)
),
metadata_symbol_state AS (
    SELECT metadata, symbol
    FROM {db_metadata:Identifier}.metadata_symbol_state FINAL
    WHERE metadata IN (SELECT metadata FROM metadata_mint_state)
),
metadata_state AS (
    SELECT
        mm.mint,
        mm.metadata as metadata,
        coalesce(n.name, s.symbol) as name,
        s.symbol
    FROM metadata_mint_state AS mm
    LEFT JOIN metadata_name_state AS n ON mm.metadata = n.metadata
    LEFT JOIN metadata_symbol_state AS s ON mm.metadata = s.metadata
),
ohlc AS (
    SELECT
        /* Time */
        o.datetime AS datetime,

        /* DEX identity */
        o.program_id AS program_id,
        o.amm AS amm,
        o.amm_pool AS amm_pool,
        o.mint0 AS mint0,
        o.mint1 AS mint1,
        m0.symbol AS symbol0,
        m1.symbol AS symbol1,

        /* OHLC */
        pow(10, coalesce(d1.decimals, 1) - coalesce(d0.decimals, 1)) AS price_multiplier,
        o.open0 / price_multiplier AS open_raw,
        greatest(
            o.high_quantile0,
            o.open0,
            o.close0
        ) / price_multiplier AS high_raw,
        least(
            o.low_quantile0,
            o.open0,
            o.close0
        ) / price_multiplier AS low_raw,
        o.close0 / price_multiplier AS close_raw,

        /* Volume */
        o.gross_volume0 / pow(10, coalesce(d0.decimals, 1)) AS volume,

        /* Universal */
        o.transactions AS transactions,

        /* extra fields */
        o.mint0 IN {stablecoin_contracts: Array(String)} AS is_stablecoin
    FROM base_ohlc AS o
    LEFT JOIN decimals_state AS d0 ON o.mint0 = d0.mint
    LEFT JOIN decimals_state AS d1 ON o.mint1 = d1.mint
    LEFT JOIN metadata_state AS m0 ON o.mint0 = m0.mint
    LEFT JOIN metadata_state AS m1 ON o.mint1 = m1.mint
)
SELECT
    /* Time */
    datetime,

    /* DEX identity */
    CONCAT(o.symbol0, o.symbol1) AS ticker,
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
