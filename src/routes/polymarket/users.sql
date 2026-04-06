SELECT
    user,
    sum(buy_count) AS buys,
    sum(sell_count) AS sells,
    sum(transactions) AS transactions,
    toFloat64(sum(buy_cost)) / 1e6 AS volume_bought,
    toFloat64(sum(sell_revenue)) / 1e6 AS volume_sold,
    toFloat64(sum(buy_cost) + sum(sell_revenue)) / 1e6 AS total_volume,
    toFloat64(sum(sell_revenue) - sum(buy_cost)) / 1e6 AS realized_pnl,
    min(min_timestamp) AS first_trade,
    max(max_timestamp) AS last_trade
FROM {db_polymarket:Identifier}.state_user
WHERE (isNull({user:Nullable(String)}) OR user = {user:Nullable(String)})
GROUP BY user
