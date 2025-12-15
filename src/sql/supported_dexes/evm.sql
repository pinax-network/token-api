SELECT
    protocol,
    factory,
    sum(transactions) as transactions,
    max(max_timestamp) as last_activity,
    uniqMerge(uniq_tx_from) as uaw
FROM state_pools_aggregating_by_pool
GROUP BY
    protocol,
    factory
ORDER BY transactions DESC
LIMIT 100
