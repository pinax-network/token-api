WITH 
pool_metadata AS (
    SELECT
        p.pool,
        p.token0, p.token1,
        t0.symbol AS token0_symbol,
        t1.symbol AS token1_symbol,
        t0.decimals AS token0_decimals,
        t1.decimals AS token1_decimals,
        CASE 
            WHEN p.token0 = {contract: String} THEN 0
            WHEN p.token1 = {contract: String} THEN 1
            ELSE NULL
        END AS weth_position
    FROM pools AS p
    LEFT JOIN contracts AS t0 FINAL ON p.token0 = t0.address
    LEFT JOIN contracts AS t1 FINAL ON p.token1 = t1.address
    WHERE 
        isNotNull(t0.decimals) AND isNotNull(t1.decimals) AND
        (p.token0 = {contract: String} OR p.token1 = {contract: String}) AND
        (p.token0 IN {stablecoin_contracts: Array(String)} OR p.token1 IN {stablecoin_contracts: Array(String)})
),
unified_ohlc AS (
    SELECT
        if(
            toTime(toStartOfInterval(o.timestamp, INTERVAL {interval_minute: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(o.timestamp, INTERVAL {interval_minute: UInt64} MINUTE)),
            toStartOfInterval(o.timestamp, INTERVAL {interval_minute: UInt64} MINUTE)
        ) AS datetime,
        m.weth_position,
        m.token0_symbol,
        m.token1_symbol,
        m.token0_decimals,
        m.token1_decimals,
        CASE 
            WHEN m.weth_position = 0 THEN argMinMerge(o.open0)
            WHEN m.weth_position = 1 THEN 1/argMinMerge(o.open0)
        END AS open_raw,
        CASE 
            WHEN m.weth_position = 0 THEN quantileDeterministicMerge({high_quantile: Float32})(o.high0)
            WHEN m.weth_position = 1 THEN 1/quantileDeterministicMerge({low_quantile: Float32})(o.low0)
        END AS high_raw,
        CASE 
            WHEN m.weth_position = 0 THEN quantileDeterministicMerge({low_quantile: Float32})(o.low0)
            WHEN m.weth_position = 1 THEN 1/quantileDeterministicMerge({high_quantile: Float32})(o.high0)
        END AS low_raw,
        CASE 
            WHEN m.weth_position = 0 THEN argMaxMerge(o.close0)
            WHEN m.weth_position = 1 THEN 1/argMaxMerge(o.close0)
        END AS close_raw,
        CASE
            WHEN m.weth_position = 0 THEN sum(o.gross_volume1)
            WHEN m.weth_position = 1 THEN sum(o.gross_volume0)
        END AS volume,
        uniqMerge(o.uaw) AS uaw,
        sum(o.transactions) AS transactions
    FROM ohlc_prices AS o
    INNER JOIN pool_metadata AS m ON o.pool = m.pool
    WHERE o.timestamp >= parseDateTimeBestEffortOrZero({min_datetime: String}) 
      AND o.timestamp <= parseDateTimeBestEffort({max_datetime: String})
    GROUP BY datetime, m.weth_position, m.token0_symbol, m.token1_symbol, m.token0_decimals, m.token1_decimals
),
normalized_prices AS (
    SELECT
        datetime,
        CASE
            WHEN weth_position = 0 THEN token1_symbol
            WHEN weth_position = 1 THEN token0_symbol
        END AS stable_symbol,
        CASE
            WHEN weth_position = 0 THEN open_raw * pow(10, token0_decimals - token1_decimals)
            WHEN weth_position = 1 THEN open_raw * pow(10, token1_decimals - token0_decimals)
        END AS open,
        CASE
            WHEN weth_position = 0 THEN 
                multiIf(
                    high_raw < open_raw, open_raw,
                    high_raw < close_raw, close_raw,
                    high_raw
                ) * pow(10, token0_decimals - token1_decimals)
            WHEN weth_position = 1 THEN 
                multiIf(
                    high_raw < open_raw, open_raw,
                    high_raw < close_raw, close_raw,
                    high_raw
                ) * pow(10, token1_decimals - token0_decimals)
        END AS high,
        CASE
            WHEN weth_position = 0 THEN 
                multiIf(
                    low_raw > open_raw, open_raw,
                    low_raw > close_raw, close_raw,
                    low_raw
                ) * pow(10, token0_decimals - token1_decimals)
            WHEN weth_position = 1 THEN 
                multiIf(
                    low_raw > open_raw, open_raw,
                    low_raw > close_raw, close_raw,
                    low_raw
                ) * pow(10, token1_decimals - token0_decimals)
        END AS low,
        CASE
            WHEN weth_position = 0 THEN close_raw * pow(10, token0_decimals - token1_decimals)
            WHEN weth_position = 1 THEN close_raw * pow(10, token1_decimals - token0_decimals)
        END AS close,
        CASE
            WHEN weth_position = 0 THEN toFloat64(volume) * pow(10, -token1_decimals)
            WHEN weth_position = 1 THEN toFloat64(volume) * pow(10, -token0_decimals)
        END AS volume,
        uaw,
        transactions
    FROM unified_ohlc
)
SELECT
    datetime,
    CONCAT((SELECT token0_symbol FROM pool_metadata WHERE weth_position = 0 LIMIT 1), 'USD') AS ticker,
    quantileExactWeighted(open, normalized_prices.transactions) AS open,
    quantileExactWeighted(high, normalized_prices.transactions) AS high,
    quantileExactWeighted(low, normalized_prices.transactions) AS low,
    quantileExactWeighted(close, normalized_prices.transactions) AS close,
    sum(volume) AS volume,
    sum(uaw) AS uaw,
    sum(transactions) AS transactions
FROM normalized_prices
GROUP BY datetime, ticker
ORDER BY datetime DESC;