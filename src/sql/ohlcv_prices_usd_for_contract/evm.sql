WITH 
metadata_01 AS (
    SELECT
        p.pool,
        t0.symbol AS symbol,
        t0.decimals AS t0_decimals,
        t1.decimals AS t1_decimals
    FROM pools AS p
    LEFT JOIN contracts AS t0 FINAL ON p.token0 = t0.address
    LEFT JOIN contracts AS t1 FINAL ON p.token1 = t1.address
    WHERE isNotNull(symbol) AND isNotNull(t0_decimals) AND isNotNull(t1_decimals)
    AND token0 = {contract: String}
    AND token1 IN {stablecoin_contracts: Array(String)}
),
metadata_10 AS (
    SELECT
        p.pool,
        t0.decimals AS t0_decimals,
        t1.decimals AS t1_decimals
    FROM pools AS p
    LEFT JOIN contracts AS t0 FINAL ON p.token0 = t0.address
    LEFT JOIN contracts AS t1 FINAL ON p.token1 = t1.address
    WHERE isNotNull(t0_decimals) AND isNotNull(t1_decimals)
    AND token1 = {contract: String}
    AND token0 IN {stablecoin_contracts: Array(String)}
),
ohlc_10 AS (
    SELECT
        if(
            toTime(toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)),
            toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)
        ) AS datetime,
        1/argMinMerge(open0) AS open_raw,
        1/quantileDeterministicMerge({low_quantile: Float32})(low0) AS high_raw,
        1/quantileDeterministicMerge({high_quantile: Float32})(high0) AS low_raw,
        1/argMaxMerge(close0) AS close_raw,
        sum(gross_volume0) AS volume,
        uniqMerge(uaw) AS uaw,
        sum(transactions) AS transactions,
        t0_decimals, t1_decimals
    FROM ohlc_prices AS o_01
    INNER JOIN metadata_10 AS m ON o_01.pool = m.pool
    GROUP BY datetime, t0_decimals, t1_decimals
    HAVING datetime >= parseDateTimeBestEffortOrZero({min_datetime: String}) 
       AND datetime <= parseDateTimeBestEffort({min_datetime: String})
    ORDER BY datetime DESC
),
ohlc_01 AS (
    SELECT
        if(
            toTime(toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)),
            toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)
        ) AS datetime,
        argMinMerge(open0) AS open_raw,
        quantileDeterministicMerge({high_quantile: Float32})(high0) AS high_raw,
        quantileDeterministicMerge({high_quantile: Float32})(low0) AS low_raw,
        argMaxMerge(close0) AS close_raw,
        sum(gross_volume1) AS volume,
        uniqMerge(uaw) AS uaw,
        sum(transactions) AS transactions,
        t0_decimals, t1_decimals
    FROM ohlc_prices AS o_10
    INNER JOIN metadata_01 AS m ON o_10.pool = m.pool
    GROUP BY datetime, t0_decimals, t1_decimals
    HAVING datetime >= parseDateTimeBestEffortOrZero({min_datetime: String}) 
       AND datetime <= parseDateTimeBestEffort({max_datetime: String})
    ORDER BY datetime DESC
),
ohlc AS (
    SELECT
        datetime,
        open_raw * pow(10, t0_decimals - t1_decimals) AS open,
        multiIf(
            high_raw < open_raw, open_raw,
            high_raw < close_raw, close_raw,
            high_raw
        ) * pow(10, t0_decimals - t1_decimals) AS high,
        multiIf(
            low_raw > open_raw, open_raw,
            low_raw > close_raw, close_raw,
            low_raw
        ) * pow(10, t0_decimals - t1_decimals) AS low,
        close_raw * pow(10, t0_decimals - t1_decimals) AS close,
        toFloat64(volume) * pow(10, -t1_decimals) AS volume,
        uaw,
        transactions
    FROM ohlc_01

    UNION ALL

    SELECT
        datetime,
        open_raw * pow(10, t1_decimals - t0_decimals) AS open,
        multiIf(
            high_raw < open_raw, open_raw,
            high_raw < close_raw, close_raw,
            high_raw
        ) * pow(10, t1_decimals - t0_decimals) AS high,
        multiIf(
            low_raw > open_raw, open_raw,
            low_raw > close_raw, close_raw,
            low_raw
        ) * pow(10, t1_decimals - t0_decimals) AS low,
        close_raw * pow(10, t1_decimals - t0_decimals) AS close,
        toFloat64(volume) * pow(10, -t0_decimals) AS volume,
        uaw,
        transactions
    FROM ohlc_10
)
SELECT
    datetime,
    CONCAT((SELECT symbol FROM metadata_01 GROUP BY symbol), 'USD') AS ticker,
    quantileExactWeighted(open, ohlc.transactions) AS open,
    quantileExactWeighted(high, ohlc.transactions) AS high,
    quantileExactWeighted(low, ohlc.transactions) AS low,
    quantileExactWeighted(close, ohlc.transactions) AS close,
    sum(volume) AS volume,
    sum(uaw) AS uaw,
    sum(transactions) AS transactions
FROM ohlc
GROUP BY datetime, ticker
ORDER BY datetime DESC;