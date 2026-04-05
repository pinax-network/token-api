WITH resolved AS (
    SELECT condition_id, market_slug, closed
    FROM {db_scraper:Identifier}.polymarket_markets FINAL
    WHERE condition_id = coalesce(
        {condition_id:Nullable(String)},
        ''
    )
       OR market_slug = coalesce(
        {market_slug:Nullable(String)},
        ''
    )
    LIMIT 1
)
SELECT
    oi.timestamp,
    oi.scaled_net_open_interest AS net_open_interest,
    oi.scaled_split_amount AS split_amount,
    oi.scaled_merge_amount AS merge_amount,
    oi.split_count,
    oi.merge_count,
    oi.transactions,
    oi.unique_stakeholders,
    CAST((
        oi.condition_id,
        (SELECT market_slug FROM resolved),
        Null,
        Null,
        (SELECT closed FROM resolved)
    ) AS Tuple(condition_id String, market_slug Nullable(String), token_id Nullable(String), outcome_label Nullable(String), closed Bool)) AS market
FROM {db_polymarket:Identifier}.open_interest oi
WHERE oi.interval_min = {interval:UInt32}
  AND oi.condition_id = (SELECT condition_id FROM resolved)
  AND (isNull({start_time:Nullable(UInt64)}) OR oi.timestamp >= toDateTime({start_time:Nullable(UInt64)}))
  AND (isNull({end_time:Nullable(UInt64)}) OR oi.timestamp <= toDateTime({end_time:Nullable(UInt64)}))
ORDER BY oi.timestamp DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
