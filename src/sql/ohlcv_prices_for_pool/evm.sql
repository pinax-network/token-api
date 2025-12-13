WITH token_metadata AS (
    SELECT
        t0.contract AS token0,
        t0.symbol AS symbol0,
        t1.contract AS token1,
        t1.symbol AS symbol1
    FROM (
        SELECT DISTINCT token0, token1
        FROM ohlc_prices
        WHERE pool = {pool: String}
          AND interval_min = {interval: UInt64}
          AND timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
    ) AS p
    LEFT JOIN {db_evm_tokens:Identifier}.metadata_view AS t0 ON p.token0 = t0.contract
    LEFT JOIN {db_evm_tokens:Identifier}.metadata_view AS t1 ON p.token1 = t1.contract
),

ohlc AS (
    SELECT
        timestamp AS datetime,
        CONCAT(m.symbol0, m.symbol1) AS ticker,
        pool,
        argMinMerge(open0) AS open_raw,
        greatest(
            quantileDeterministicMerge({high_quantile: Float32})(quantile0),
            argMinMerge(open0),
            argMaxMerge(close0)
        ) AS high_raw,
        least(
            quantileDeterministicMerge({low_quantile: Float32})(quantile0),
            argMinMerge(open0),
            argMaxMerge(close0)
        ) AS low_raw,
        argMaxMerge(close0) AS close_raw,
        sum(gross_volume0) AS volume,
        uniqMerge(uaw) AS uaw,
        sum(transactions) AS transactions,
        p.token0 IN {stablecoin_contracts: Array(String)} AS is_stablecoin
    FROM ohlc_prices p
    JOIN token_metadata m ON p.token0 = m.token0 AND p.token1 = m.token1
    WHERE p.pool = {pool: String}
      AND p.interval_min = {interval: UInt64}
      AND p.timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
    GROUP BY datetime, pool, m.symbol0, m.symbol1, p.token0, p.token1, ticker
    ORDER BY datetime DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    datetime,
    ticker,
    pool,
    if(is_stablecoin, 1/open_raw, open_raw) AS open,
    if(is_stablecoin, 1/low_raw, high_raw) AS high,
    if(is_stablecoin, 1/high_raw, low_raw) AS low,
    if(is_stablecoin, 1/close_raw, close_raw) AS close,
    volume,
    uaw,
    transactions
FROM ohlc


-- old schema
-- WITH ohlc AS (
--     SELECT
--         if(
--             toTime(toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
--             toDate(toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)),
--             toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)
--         ) AS datetime,
--         CONCAT(symbol0, symbol1) AS ticker,
--         pool,
--         argMinMerge(open0) AS open_raw,
--         greatest(quantileDeterministicMerge({high_quantile: Float32})(quantile0), open_raw, close_raw) AS high_raw,
--         least(quantileDeterministicMerge({low_quantile: Float32})(quantile0), open_raw, close_raw) AS low_raw,
--         argMaxMerge(close0) AS close_raw,
--         sum(gross_volume0) AS volume,
--         uniqMerge(uaw) AS uaw,
--         sum(transactions) AS transactions,
--         toString(token0) IN {stablecoin_contracts: Array(String)} AS is_stablecoin
--     FROM ohlc_prices
--     WHERE pool = {pool: String} AND timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
--     GROUP BY datetime, pool, symbol0, symbol1, token0
--     ORDER BY datetime DESC
--     LIMIT   {limit:UInt64}
--     OFFSET  {offset:UInt64}
-- )
-- SELECT
--     datetime,
--     ticker,
--     pool,
--     if(is_stablecoin, 1/open_raw, open_raw) AS open,
--     if(is_stablecoin, 1/low_raw, high_raw) AS high,
--     if(is_stablecoin, 1/high_raw, low_raw) AS low,
--     if(is_stablecoin, 1/close_raw, close_raw) AS close,
--     volume,
--     uaw,
--     transactions
-- FROM ohlc
