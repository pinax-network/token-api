WITH combined_prices AS
(
    SELECT
        if(
            toTime(toStartOfInterval(datetime, INTERVAL {interval_minute: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(datetime, INTERVAL {interval_minute: UInt64} MINUTE)),
            toStartOfInterval(datetime, INTERVAL {interval_minute: UInt64} MINUTE)
        ) AS datetime,
        CONCAT((SELECT symbol FROM contracts WHERE address = {contract: String}), 'USD') AS ticker,
        argMinMerge(open) AS open,
        multiIf(
            quantile({high_quantile: Float32})(high) < open,
            open,
            quantile({high_quantile: Float32})(high) < close,
            close,
            quantile({high_quantile: Float32})(high)
        ) AS high,
        multiIf(
            quantile({low_quantile: Float32})(low) > open,
            open,
            quantile({low_quantile: Float32})(low) > close,
            close,
            quantile({low_quantile: Float32})(low)
        ) AS low,
        argMaxMerge(close) AS close,
        sum(volume) AS volume,
        count(*) AS count
    FROM ohlc_from_swaps
    WHERE token1 = {contract: String} AND token0 IN {stablecoin_contracts: Array(String)}
    GROUP BY datetime
    HAVING datetime >= parseDateTimeBestEffortOrZero({min_datetime: String}) AND datetime <= parseDateTimeBestEffort({max_datetime: String})
    ORDER BY datetime DESC

    UNION ALL

    SELECT
        if(
            toTime(toStartOfInterval(datetime, INTERVAL {interval_minute: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(datetime, INTERVAL {interval_minute: UInt64} MINUTE)),
            toStartOfInterval(datetime, INTERVAL {interval_minute: UInt64} MINUTE)
        ) AS datetime,
        CONCAT((SELECT symbol FROM contracts WHERE address = {contract: String}), 'USD') AS ticker,
        1/argMinMerge(open) AS open,
        multiIf(
            quantile({high_quantile: Float32})(1/ohlc.low) < open,
            open,
            quantile({high_quantile: Float32})(1/ohlc.low) < close,
            close,
            quantile({high_quantile: Float32})(1/ohlc.low)
        ) AS high,
        multiIf(
            quantile({low_quantile: Float32})(1/ohlc.high) > open,
            open,
            quantile({low_quantile: Float32})(1/ohlc.high) > close,
            close,
            quantile({low_quantile: Float32})(1/ohlc.high)
        ) AS low,
        1/argMaxMerge(close) AS close,
        sum(volume) AS volume,
        count(*) AS count
    FROM ohlc_from_swaps AS ohlc
    WHERE token0 = {contract: String} AND token1 IN {stablecoin_contracts: Array(String)}
    GROUP BY datetime
    HAVING datetime >= parseDateTimeBestEffortOrZero({min_datetime: String}) AND datetime <= parseDateTimeBestEffort({max_datetime: String})
    ORDER BY datetime DESC
)
SELECT 
    datetime,
    ticker,
    quantileExactWeighted(open, count) AS open,
    quantileExactWeighted(high, count) AS high,
    quantileExactWeighted(low, count) AS low,
    quantileExactWeighted(close, count) AS close,
    sum(volume) AS volume
FROM combined_prices
GROUP BY datetime, ticker
ORDER BY datetime DESC;