WITH
uaw_counts AS (
    SELECT factory, protocol, count(DISTINCT tx_from) AS uaw
    FROM {db_dex:Identifier}.state_pools_uaw_by_tx_from
    GROUP BY factory, protocol
)
SELECT
    p.factory,
    p.protocol,
    /* count() as pools, */
    max(p.max_timestamp) as last_activity,
    sum(p.transactions) as transactions,
    any(u.uaw) as uaw,
    {network: String} AS network
FROM {db_dex:Identifier}.state_pools_aggregating_by_pool p
LEFT JOIN uaw_counts u ON p.factory = u.factory AND p.protocol = u.protocol
GROUP BY
    p.protocol,
    p.factory
ORDER BY transactions DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}
