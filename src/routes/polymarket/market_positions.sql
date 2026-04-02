SELECT
    p.user,
    sum(p.scaled_buy_cost) AS buy_cost,
    sum(p.scaled_sell_revenue) AS sell_revenue,
    sum(p.scaled_realized_pnl) AS realized_pnl,
    if(sum(p.scaled_buy_cost) > 0, sum(p.scaled_realized_pnl) / sum(p.scaled_buy_cost), 0) AS pnl_pct,
    sum(p.scaled_net_amount) AS net_position,
    if(sum(p.scaled_buy_amount) > 0, sum(p.scaled_buy_cost) / sum(p.scaled_buy_amount), 0) AS avg_price,
    coalesce((
        SELECT argMax(close, timestamp)
        FROM {db_polymarket:Identifier}.orderbook
        WHERE interval_min = 1440 AND asset_id = {token_id:String}
    ), 0) AS current_price,
    sum(p.scaled_net_amount) * current_price AS position_value,
    toBool(sum(p.scaled_net_amount) != 0) AS active,
    sum(p.buy_count) AS buys,
    sum(p.sell_count) AS sells,
    sum(p.transactions) AS transactions,
    CAST((nullIf(a.condition_id, ''), nullIf(a.market_slug, ''), toString(p.token_id), nullIf(a.outcome_label, ''))
        AS Tuple(condition_id Nullable(String), market_slug Nullable(String), token_id String, outcome_label Nullable(String))) AS market
FROM {db_polymarket:Identifier}.market_position p
LEFT JOIN {db_scraper:Identifier}.polymarket_markets_by_asset_id a
    ON a.asset_id = p.token_id
WHERE p.interval_min = 1440
  AND p.token_id = toUInt256({token_id:String})
GROUP BY p.user, p.token_id, a.condition_id, a.market_slug, a.outcome_label
