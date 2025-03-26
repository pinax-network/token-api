SELECT
    if(
        toTime(toStartOfInterval(datetime, INTERVAL {interval_minute: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
        toDate(toStartOfInterval(datetime, INTERVAL {interval_minute: UInt64} MINUTE)),
        toStartOfInterval(datetime, INTERVAL {interval_minute: UInt64} MINUTE)
    ) AS datetime,
    CONCAT((SELECT symbol FROM contracts WHERE address = {contract: String}), 'USD') AS ticker,
    if(
        quantile({high_quantile: Float32})(high) < open,
        open,
        quantile({high_quantile: Float32})(high)
    ) AS high,
    if(
        quantile({low_quantile: Float32})(low) > close,
        close,
        quantile({low_quantile: Float32})(low)
    ) AS low,
    sum(volume) AS volume,
    argMinMerge(open) AS open,
    argMaxMerge(close) AS close
FROM ohlc_from_swaps
WHERE token1 = {contract: String} AND token0 IN {stablecoin_contracts: Array(String)}
GROUP BY token1, datetime
HAVING datetime >= parseDateTimeBestEffortOrZero({min_datetime: String}) AND datetime <= parseDateTimeBestEffort({max_datetime: String})
ORDER BY datetime DESC;