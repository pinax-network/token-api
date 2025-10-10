WITH
metadata AS (
    SELECT
        address,
        name,
        symbol,
        decimals
    FROM erc20_metadata_initialize
    WHERE toString(address) IN {stablecoin_contracts: Array(String)}
),
filtered_pools AS (
    SELECT
        pool,
        decimals AS stable_decimals,
        (
            SELECT decimals
            FROM erc20_metadata_initialize
            WHERE address = {contract: String}
        ) AS token_decimals,
        pow(10, -abs(token_decimals - stable_decimals)) AS scale_factor
    FROM pools AS p
    LEFT JOIN metadata AS m ON p.token0 = m.address OR p.token1 = m.address 
    WHERE
        p.token0 = {contract: String}
        OR p.token1 = {contract: String}
),
normalized_prices AS (
    SELECT
        if(
            toTime(toStartOfInterval(o.timestamp, INTERVAL {interval: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(o.timestamp, INTERVAL {interval: UInt64} MINUTE)),
            toStartOfInterval(o.timestamp, INTERVAL {interval: UInt64} MINUTE)
        ) AS datetime,
        argMin(open, o.timestamp) AS open,
        max(high) AS high,
        min(low) AS low,
        argMax(close, o.timestamp) AS close,
        sum(o.volume) AS volume,
        sum(uaw) AS uaw,
        sum(transactions) AS transactions
    FROM ohlc_prices_by_contract AS o
    JOIN filtered_pools AS p ON p.pool = o.pool
    WHERE token = {contract: String}
        AND o.timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
    GROUP BY datetime, pool, scale_factor
)
SELECT
    datetime,
    CONCAT((SELECT symbol FROM erc20_metadata_initialize FINAL WHERE address = {contract: String}), 'USD') AS ticker,
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
LIMIT {limit:UInt64}
OFFSET {offset:UInt64};