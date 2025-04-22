WITH 
metadata AS (
    SELECT
        p.pool,
        t0.symbol AS t0_symbol,
        t0.decimals AS t0_decimals,
        t1.symbol AS t1_symbol,
        t1.decimals AS t1_decimals
    FROM pools AS p
    LEFT JOIN contracts AS t0 FINAL ON p.token0 = t0.address
    LEFT JOIN contracts AS t1 FINAL ON p.token1 = t1.address
    WHERE p.pool = {pool: String}
),
ohlc AS (
    SELECT
        if(
            toTime(toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)),
            toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)
        ) AS datetime,
        CONCAT((SELECT t1_symbol FROM metadata), (SELECT t0_symbol FROM metadata)) AS ticker,
        1/argMinMerge(open0) AS open_raw,
        1/quantileDeterministicMerge({low_quantile: Float32})(low0) AS high_raw,
        1/quantileDeterministicMerge({high_quantile: Float32})(high0) AS low_raw,
        1/argMaxMerge(close0) AS close_raw,
        sum(gross_volume0) AS volume,
        uniqMerge(uaw) AS uaw,
        sum(transactions) AS transactions
    FROM ohlc_prices
    WHERE pool = {pool: String}
    GROUP BY datetime
    HAVING datetime >= parseDateTimeBestEffortOrZero({min_datetime: String}) 
       AND datetime <= parseDateTimeBestEffort({max_datetime: String})
    ORDER BY datetime DESC
)
SELECT
    datetime,
    ticker,
    open_raw * pow(10, (SELECT t1_decimals FROM metadata) - (SELECT t0_decimals FROM metadata)) AS open,
    multiIf(
        high_raw < open_raw, open_raw,
        high_raw < close_raw, close_raw,
        high_raw
    ) * pow(10, (SELECT t1_decimals FROM metadata) - (SELECT t0_decimals FROM metadata)) AS high,
    multiIf(
        low_raw > open_raw, open_raw,
        low_raw > close_raw, close_raw,
        low_raw
    ) * pow(10, (SELECT t1_decimals FROM metadata) - (SELECT t0_decimals FROM metadata)) AS low,
    close_raw * pow(10, (SELECT t1_decimals FROM metadata) - (SELECT t0_decimals FROM metadata)) AS close,
    volume,
    uaw,
    transactions
FROM ohlc;