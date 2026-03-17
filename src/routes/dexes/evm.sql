SELECT
    factory,
    protocol,
    /* count() as pools, */
    max(max_timestamp) as last_activity,
    sum(transactions) as transactions,
    uniqMerge(uniq_user) as uaw,
    {network: String} AS network
FROM {db_dex:Identifier}.state_pools_aggregating_by_pool
GROUP BY
    protocol,
    factory
ORDER BY transactions DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}
