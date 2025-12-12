WITH all_dexes AS (
    SELECT
        factory,
        protocol,
        sum(transactions) as transactions,
        uniqMerge(uaw) as uaw,
        max(timestamp) as last_activity
    FROM ohlc_prices
    WHERE interval_min = 1440
    GROUP BY
        protocol,
        factory
)
SELECT * FROM all_dexes
ORDER BY transactions DESC, uaw DESC, protocol, factory
LIMIT 100
