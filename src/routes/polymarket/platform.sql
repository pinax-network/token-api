SELECT
    v.timestamp AS timestamp,
    v.scaled_collateral_volume AS volume,
    v.scaled_collateral_buy_volume AS buy_volume,
    v.scaled_collateral_sell_volume AS sell_volume,
    v.trades_quantity AS trades,
    v.buys_quantity AS buys,
    v.sells_quantity AS sells,
    oi.scaled_net_open_interest AS net_open_interest,
    oi.scaled_split_amount AS split_amount,
    oi.scaled_merge_amount AS merge_amount,
    oi.split_count,
    oi.merge_count,
    oi.transactions AS oi_transactions,
    f.scaled_total_fee AS total_fees,
    f.fee_count,
    f.effective_fee_rate
FROM {db_polymarket:Identifier}.orderbook_global v
LEFT JOIN {db_polymarket:Identifier}.open_interest_global oi
    ON oi.timestamp = v.timestamp AND oi.interval_min = v.interval_min
LEFT JOIN {db_polymarket:Identifier}.fee_global f
    ON f.timestamp = v.timestamp AND f.interval_min = v.interval_min
WHERE v.interval_min = {interval:UInt32}
  AND (isNull({start_time:Nullable(UInt64)}) OR v.timestamp >= toDateTime({start_time:Nullable(UInt64)}))
  AND (isNull({end_time:Nullable(UInt64)}) OR v.timestamp <= toDateTime({end_time:Nullable(UInt64)}))
ORDER BY v.timestamp DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
