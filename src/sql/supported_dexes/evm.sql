WITH all_dexes AS (
    SELECT
        replaceAll(CAST(protocol AS String), '-', '_') AS protocol,
        factory,
        sum(transactions) as transactions,
        uniqMerge(uaw) as uaw,
        max(timestamp) as last_activity
    FROM ohlc_prices
    WHERE interval_min = 10080
    GROUP BY
        protocol,
        factory
)
SELECT * FROM all_dexes
ORDER BY transactions DESC
LIMIT 100

-- SELECT
--     toString(factory) AS factory,
--     protocol,
--     sum(uaw) AS uaw,
--     sum(transactions) AS transactions,
--     max(timestamp) as last_activity
-- FROM pool_activity_summary
-- GROUP BY
--     factory, protocol
-- ORDER BY transactions DESC, uaw DESC, protocol, factory
