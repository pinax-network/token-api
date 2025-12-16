SELECT
    protocol,
    factory,
    max(max_timestamp) as last_activity,
    sum(transactions) as transactions,
    uniqMerge(uniq_tx_from) as uaw
FROM state_pools_aggregating_by_pool
GROUP BY
    protocol,
    factory
ORDER BY transactions DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}