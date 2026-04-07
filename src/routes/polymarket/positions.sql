SELECT
    p.user,
    sum(p.scaled_buy_cost) AS buy_cost,
    sum(p.scaled_sell_revenue) AS sell_revenue,
    sum(p.scaled_realized_pnl) AS realized_pnl,
    if(sum(p.scaled_buy_cost) > 0, sum(p.scaled_realized_pnl) / sum(p.scaled_buy_cost), 0) AS pnl_pct,
    sum(p.scaled_net_amount) AS net_position,
    if(sum(p.scaled_buy_amount) > 0, sum(p.scaled_buy_cost) / sum(p.scaled_buy_amount), 0) AS avg_price,
    coalesce(lp.close, 0) AS current_price,
    sum(p.scaled_net_amount) * coalesce(lp.close, 0) AS position_value,
    if(sum(p.scaled_net_amount) > 0, sum(p.scaled_net_amount) * coalesce(lp.close, 0), 0) AS unrealized_pnl,
    sum(p.scaled_realized_pnl) + if(sum(p.scaled_net_amount) > 0, sum(p.scaled_net_amount) * coalesce(lp.close, 0), 0) AS total_pnl,
    toBool(sum(p.scaled_net_amount) != 0) AS active,
    sum(p.buy_count) AS buys,
    sum(p.sell_count) AS sells,
    sum(p.transactions) AS transactions,
    CAST((nullIf(a.condition_id, ''), nullIf(a.market_slug, ''), toString(p.token_id), nullIf(a.outcome_label, ''), a.closed)
        AS Tuple(condition_id Nullable(String), market_slug Nullable(String), token_id String, outcome_label Nullable(String), closed Bool)) AS market
FROM {db_polymarket:Identifier}.user_position p
LEFT JOIN {db_scraper:Identifier}.polymarket_markets_by_asset_id a
    ON a.asset_id = p.token_id
LEFT JOIN {db_polymarket:Identifier}.state_latest_price lp FINAL
    ON lp.asset_id = toString(p.token_id)
WHERE p.interval_min = 1440
  AND p.user = {user:String}
  AND (isNull({token_id:Nullable(String)}) OR p.token_id = toUInt256({token_id:Nullable(String)}))
  AND (isNull({condition_id:Nullable(String)}) OR a.condition_id = {condition_id:Nullable(String)})
  AND (isNull({market_slug:Nullable(String)}) OR a.market_slug = {market_slug:Nullable(String)})
GROUP BY p.user, p.token_id, a.condition_id, a.market_slug, a.outcome_label, a.closed, lp.close
