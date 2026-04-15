WITH resolved_token AS (
    SELECT condition_id
    FROM {db_scraper:Identifier}.polymarket_markets_by_asset_id
    WHERE isNull({condition_id:Nullable(String)})
      AND isNull({market_slug:Nullable(String)})
      AND isNotNull({token_id:Nullable(String)})
      AND asset_id = toUInt256({token_id:Nullable(String)})
    LIMIT 1
)
SELECT
    m.condition_id,
    m.market_slug,
    e.slug AS event_slug,
    e.title AS event_title,
    m.question,
    m.description,
    CAST(arrayMap((o, t) -> (o, t), m.outcomes, m.clob_token_ids)
        AS Array(Tuple(label String, token_id String))) AS outcomes,
    m.closed,
    m.neg_risk,
    m.accepting_orders,
    m.fees_enabled,
    m.volume_num AS volume,
    m.start_date,
    m.end_date
FROM {db_scraper:Identifier}.polymarket_markets m FINAL
LEFT JOIN {db_scraper:Identifier}.polymarket_events e FINAL
    ON e.condition_id = m.condition_id
WHERE
    CASE
        WHEN isNotNull({condition_id:Nullable(String)})
            THEN m.condition_id = {condition_id:Nullable(String)}
        WHEN isNotNull({market_slug:Nullable(String)})
            THEN m.market_slug = {market_slug:Nullable(String)}
        WHEN isNotNull({token_id:Nullable(String)})
            THEN m.condition_id = (SELECT condition_id FROM resolved_token)
        WHEN isNotNull({event_slug:Nullable(String)})
            THEN e.slug = {event_slug:Nullable(String)}
        ELSE 1 = 1
    END
  AND (isNull({closed:Nullable(UInt8)}) OR m.closed = {closed:Nullable(UInt8)})
ORDER BY m.volume_num DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
