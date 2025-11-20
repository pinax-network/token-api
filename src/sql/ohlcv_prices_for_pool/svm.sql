WITH ohlc AS
(
    SELECT
        if(
            toTime(toStartOfInterval(o.timestamp, INTERVAL {interval:UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(o.timestamp, INTERVAL {interval:UInt64} MINUTE)),
            toStartOfInterval(o.timestamp, INTERVAL {interval:UInt64} MINUTE)
        ) AS datetime,
        toString(o.amm) AS amm,
        toString(o.amm_pool) AS amm_pool,
        toString(o.mint0) AS token0,
        toString(o.mint1) AS token1,
        argMinMerge(open0) AS open_raw,
        quantileDeterministicMerge({high_quantile:Float64})(quantile0) AS high_raw,
        quantileDeterministicMerge({low_quantile:Float64})(quantile0) AS low_raw,
        argMaxMerge(close0) AS close_raw,
        sum(gross_volume1) AS volume,
        uniqMerge(uaw) AS uaw,
        sum(transactions) AS transactions,
        token0 IN {stablecoin_contracts:Array(String)} AS is_stablecoin
    FROM ohlc_prices AS o
    WHERE amm_pool = {amm_pool:String}
    AND timestamp >= today() - toIntervalMinute(({offset:UInt64} + {limit:UInt64} - 1) * {interval:UInt64})
    AND timestamp <= today() - toIntervalMinute({offset:UInt64} * {interval:UInt64})
    GROUP BY token0, token1, amm, amm_pool, datetime
)
SELECT
    datetime,
    amm,
    amm_pool,
    token0,
    coalesce(
        (SELECT decimals FROM {db_svm_tokens:Identifier}.decimals_state WHERE mint IN (SELECT token0 FROM ohlc) AND decimals != 0),
        9
    ) AS token0_decimals,
    token1,
    coalesce(
        (SELECT decimals FROM {db_svm_tokens:Identifier}.decimals_state WHERE mint IN (SELECT token1 FROM ohlc) AND decimals != 0),
        9
    ) AS token1_decimals,
    pow(10, -(token1_decimals - token0_decimals)) * if(is_stablecoin, 1/open_raw, open_raw) AS open,
    pow(10, -(token1_decimals - token0_decimals)) * if(is_stablecoin, 1/low_raw, high_raw) AS high,
    pow(10, -(token1_decimals - token0_decimals)) * if(is_stablecoin, 1/high_raw, low_raw) AS low,
    pow(10, -(token1_decimals - token0_decimals)) * if(is_stablecoin, 1/close_raw, close_raw) AS close,
    pow(10, -(token1_decimals)) * toFloat64(volume) * if(is_stablecoin, close, 1) AS volume,
    uaw,
    transactions
FROM ohlc AS o
ORDER BY datetime DESC;
