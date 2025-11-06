SELECT
    toString(factory) AS factory,
    protocol,
    sum(uaw) AS uaw,
    sum(transactions) AS transactions,
    max(timestamp) as last_activity
FROM pool_activity_summary
GROUP BY
    factory, protocol
ORDER BY transactions DESC, uaw DESC, protocol, factory