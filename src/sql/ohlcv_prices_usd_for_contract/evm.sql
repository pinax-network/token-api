WITH
metadata AS (
    SELECT
        address,
        name,
        symbol,
        decimals
    FROM contracts
    WHERE address IN {stablecoin_contracts: Array(String)}
),
filtered_pools AS (
    SELECT
        pool,
        pow(
            10,
            abs((SELECT decimals FROM contracts FINAL WHERE address = {contract: String}) - decimals)
        ) AS decimals_factor,
        decimals
    FROM pools AS p
    JOIN metadata AS m ON p.token0 = m.address OR p.token1 = m.address 
    WHERE
        p.token0 = {contract: String}
        OR p.token1 = {contract: String}
),
normalized_prices AS (
    SELECT
        if(
            toTime(toStartOfInterval(o.timestamp, INTERVAL {interval_minute: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(o.timestamp, INTERVAL {interval_minute: UInt64} MINUTE)),
            toStartOfInterval(o.timestamp, INTERVAL {interval_minute: UInt64} MINUTE)
        ) AS datetime,
        decimals_factor * argMin(open, o.timestamp) AS open,
        decimals_factor * max(high) AS high,
        decimals_factor * min(low) AS low,
        decimals_factor * argMax(close, o.timestamp) AS close,
        pow(10, -decimals) * toFloat64(sum(o.volume)) AS volume,
        sum(uaw) AS uaw,
        sum(transactions) AS transactions
    FROM ohlc_prices_by_contract AS o
    JOIN filtered_pools AS p ON p.pool = o.pool
    WHERE token = {contract: String}
        AND o.timestamp >= parseDateTimeBestEffortOrZero({min_datetime: String})
        AND o.timestamp <= parseDateTimeBestEffort({max_datetime: String})
    GROUP BY datetime, pool, decimals_factor, decimals
)
SELECT
    datetime,
    CONCAT((SELECT symbol FROM contracts FINAL WHERE address = {contract: String}), 'USD') AS ticker,
    quantileExactWeighted(open, n.transactions + n.uaw) AS open,
    quantileExactWeighted(high, n.transactions + n.uaw) AS high,
    quantileExactWeighted(low, n.transactions + n.uaw) AS low,
    quantileExactWeighted(close, n.transactions + n.uaw) AS close,
    sum(volume) AS volume,
    sum(uaw) AS uaw,
    sum(transactions) AS transactions
FROM normalized_prices AS n
GROUP BY datetime, ticker
ORDER BY datetime DESC
LIMIT {limit:int}
OFFSET {offset:int};