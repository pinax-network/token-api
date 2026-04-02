WITH
    start_minute AS (
        SELECT if(
            isNotNull({start_time:Nullable(UInt64)}),
            toRelativeMinuteNum(toDateTime({start_time:Nullable(UInt64)})),
            toRelativeMinuteNum(now() - INTERVAL 24 HOUR)
        ) AS m
    ),
    end_minute AS (
        SELECT if(
            isNotNull({end_time:Nullable(UInt64)}),
            toRelativeMinuteNum(toDateTime({end_time:Nullable(UInt64)})),
            toRelativeMinuteNum(now())
        ) AS m
    ),
    activity AS (
        SELECT
            'trade' AS event_type,
            timestamp,
            block_num,
            tx_hash,
            taker AS user,
            toString(taker_amount_filled) AS amount,
            taker_amount_filled / pow(10, 6) AS value,
            toString(fee) AS fee_amount,
            fee / pow(10, 6) AS fee_value,
            CAST((nullIf(a.condition_id, ''), nullIf(a.market_slug, ''), toString(if(t.taker_asset_id = 0, t.maker_asset_id, t.taker_asset_id)), nullIf(a.outcome_label, ''))
                AS Tuple(condition_id Nullable(String), market_slug Nullable(String), token_id String, outcome_label Nullable(String))) AS market
        FROM {db_polymarket:Identifier}.ctfexchange_order_filled t
        LEFT JOIN {db_scraper:Identifier}.polymarket_markets_by_asset_id a
            ON a.asset_id = if(t.taker_asset_id = 0, t.maker_asset_id, t.taker_asset_id)
        WHERE (isNotNull({user:Nullable(String)}) OR isNotNull({token_id:Nullable(String)}))
          AND minute >= (SELECT m FROM start_minute)
          AND minute <= (SELECT m FROM end_minute)
          AND (isNull({user:Nullable(String)}) OR taker = {user:Nullable(String)})
          AND (isNull({token_id:Nullable(String)}) OR if(t.taker_asset_id = 0, t.maker_asset_id, t.taker_asset_id) = toUInt256({token_id:Nullable(String)}))

        UNION ALL

        SELECT
            'trade' AS event_type,
            timestamp,
            block_num,
            tx_hash,
            maker AS user,
            toString(maker_amount_filled) AS amount,
            maker_amount_filled / pow(10, 6) AS value,
            toString(fee) AS fee_amount,
            fee / pow(10, 6) AS fee_value,
            CAST((nullIf(a.condition_id, ''), nullIf(a.market_slug, ''), toString(if(t.taker_asset_id = 0, t.maker_asset_id, t.taker_asset_id)), nullIf(a.outcome_label, ''))
                AS Tuple(condition_id Nullable(String), market_slug Nullable(String), token_id String, outcome_label Nullable(String))) AS market
        FROM {db_polymarket:Identifier}.ctfexchange_order_filled t
        LEFT JOIN {db_scraper:Identifier}.polymarket_markets_by_asset_id a
            ON a.asset_id = if(t.taker_asset_id = 0, t.maker_asset_id, t.taker_asset_id)
        WHERE (isNotNull({user:Nullable(String)}) OR isNotNull({token_id:Nullable(String)}))
          AND minute >= (SELECT m FROM start_minute)
          AND minute <= (SELECT m FROM end_minute)
          AND (isNull({user:Nullable(String)}) OR maker = {user:Nullable(String)})
          AND (isNull({token_id:Nullable(String)}) OR if(t.taker_asset_id = 0, t.maker_asset_id, t.taker_asset_id) = toUInt256({token_id:Nullable(String)}))

        UNION ALL

        SELECT
            'split' AS event_type,
            timestamp,
            block_num,
            tx_hash,
            stakeholder AS user,
            toString(s.amount) AS amount,
            s.amount / pow(10, 6) AS value,
            '0' AS fee_amount,
            0 AS fee_value,
            CAST((s.condition_id, m.market_slug, Null, Null)
                AS Tuple(condition_id Nullable(String), market_slug Nullable(String), token_id Nullable(String), outcome_label Nullable(String))) AS market
        FROM {db_polymarket:Identifier}.conditionaltokens_position_split s
        LEFT JOIN {db_scraper:Identifier}.polymarket_markets m FINAL
            ON m.condition_id = s.condition_id
        WHERE (isNotNull({user:Nullable(String)}) OR isNotNull({condition_id:Nullable(String)}))
          AND minute >= (SELECT m FROM start_minute)
          AND minute <= (SELECT m FROM end_minute)
          AND (isNull({user:Nullable(String)}) OR stakeholder = {user:Nullable(String)})
          AND (isNull({condition_id:Nullable(String)}) OR s.condition_id = {condition_id:Nullable(String)})

        UNION ALL

        SELECT
            'merge' AS event_type,
            timestamp,
            block_num,
            tx_hash,
            stakeholder AS user,
            toString(mg.amount) AS amount,
            mg.amount / pow(10, 6) AS value,
            '0' AS fee_amount,
            0 AS fee_value,
            CAST((mg.condition_id, m.market_slug, Null, Null)
                AS Tuple(condition_id Nullable(String), market_slug Nullable(String), token_id Nullable(String), outcome_label Nullable(String))) AS market
        FROM {db_polymarket:Identifier}.conditionaltokens_positions_merge mg
        LEFT JOIN {db_scraper:Identifier}.polymarket_markets m FINAL
            ON m.condition_id = mg.condition_id
        WHERE (isNotNull({user:Nullable(String)}) OR isNotNull({condition_id:Nullable(String)}))
          AND minute >= (SELECT m FROM start_minute)
          AND minute <= (SELECT m FROM end_minute)
          AND (isNull({user:Nullable(String)}) OR stakeholder = {user:Nullable(String)})
          AND (isNull({condition_id:Nullable(String)}) OR mg.condition_id = {condition_id:Nullable(String)})

        UNION ALL

        SELECT
            'redeem' AS event_type,
            timestamp,
            block_num,
            tx_hash,
            redeemer AS user,
            toString(r.payout) AS amount,
            r.payout / pow(10, 6) AS value,
            '0' AS fee_amount,
            0 AS fee_value,
            CAST((r.condition_id, m.market_slug, Null, Null)
                AS Tuple(condition_id Nullable(String), market_slug Nullable(String), token_id Nullable(String), outcome_label Nullable(String))) AS market
        FROM {db_polymarket:Identifier}.conditionaltokens_payout_redemption r
        LEFT JOIN {db_scraper:Identifier}.polymarket_markets m FINAL
            ON m.condition_id = r.condition_id
        WHERE (isNotNull({user:Nullable(String)}) OR isNotNull({condition_id:Nullable(String)}))
          AND minute >= (SELECT m FROM start_minute)
          AND minute <= (SELECT m FROM end_minute)
          AND (isNull({user:Nullable(String)}) OR redeemer = {user:Nullable(String)})
          AND (isNull({condition_id:Nullable(String)}) OR r.condition_id = {condition_id:Nullable(String)})
    )
SELECT *
FROM activity
WHERE (isNull({event_type:Nullable(String)}) OR event_type = {event_type:Nullable(String)})
ORDER BY timestamp DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
