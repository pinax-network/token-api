SELECT
    o.timestamp AS timestamp,
    o.open,
    o.high,
    o.low,
    o.close,
    o.scaled_collateral_volume AS volume,
    o.trades_quantity AS trades,
    o.buys_quantity AS buys,
    o.sells_quantity AS sells,
    o.unique_makers,
    o.unique_takers,
    f.scaled_total_fee AS total_fees,
    f.fee_count,
    f.effective_fee_rate,
    CAST((a.condition_id, a.market_slug, o.asset_id, a.outcome_label)
        AS Tuple(condition_id String, market_slug String, token_id String, outcome_label String)) AS market
FROM {db_polymarket:Identifier}.orderbook o
LEFT JOIN {db_polymarket:Identifier}.fee f
    ON f.asset_id = o.asset_id AND f.timestamp = o.timestamp AND f.interval_min = o.interval_min
LEFT JOIN {db_scraper:Identifier}.polymarket_markets_by_asset_id a
    ON toString(a.asset_id) = o.asset_id
WHERE o.interval_min = {interval:UInt32}
  AND o.asset_id = {token_id:String}
  AND (isNull({start_time:Nullable(UInt64)}) OR o.timestamp >= toDateTime({start_time:Nullable(UInt64)}))
  AND (isNull({end_time:Nullable(UInt64)}) OR o.timestamp <= toDateTime({end_time:Nullable(UInt64)}))
ORDER BY o.timestamp DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
