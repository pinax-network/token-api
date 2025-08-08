WITH decimals AS (
    SELECT
        pool,
        if(decimals0 = 0, 9, decimals0) AS decimals0,
        if(decimals1 = 0, 9, decimals1) AS decimals1,
        pow(10, -abs(decimals0 - decimals1)) AS decimals_factor
    FROM ohlc_prices
    WHERE pool = {pool: String}
)
SELECT
    if(
        toTime(toStartOfInterval(o.timestamp, INTERVAL {interval: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
        toDate(toStartOfInterval(o.timestamp, INTERVAL {interval: UInt64} MINUTE)),
        toStartOfInterval(o.timestamp, INTERVAL {interval: UInt64} MINUTE)
    ) AS datetime,
    toString(pool) AS pool,
    toString(token0) AS token0,
    toString(token1) AS token1,
    decimals_factor * argMinMerge(o.open0) AS open,
    decimals_factor * quantileDeterministicMerge({high_quantile: Float32})(o.quantile0) AS high,
    decimals_factor * quantileDeterministicMerge({low_quantile: Float32})(o.quantile0) AS low,
    decimals_factor * argMaxMerge(o.close0) AS close,
    sum(o.gross_volume0) AS volume,
    uniqMerge(o.uaw) AS uaw,
    sum(o.transactions) AS transactions,
    {network_id: String} AS network_id
FROM ohlc_prices AS o
JOIN decimals USING pool
WHERE pool = {pool: String} AND timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
GROUP BY token0, token1, decimals_factor, pool, datetime
ORDER BY datetime DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}