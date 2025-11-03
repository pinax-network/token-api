WITH ohlc AS (
    SELECT
        if(
            toTime(toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)),
            toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)
        ) AS datetime,
        pool,
        token0,
        token1,
        argMinMerge(open0) AS open_raw,
        greatest(quantileDeterministicMerge({high_quantile: Float32})(quantile0), open_raw, close_raw) AS high_raw,
        least(quantileDeterministicMerge({low_quantile: Float32})(quantile0), open_raw, close_raw) AS low_raw,
        argMaxMerge(close0) AS close_raw,
        sum(gross_volume0) AS volume,
        uniqMerge(uaw) AS uaw,
        sum(transactions) AS transactions,
        toString(token0) IN {stablecoin_contracts: Array(String)} AS is_stablecoin
    FROM ohlc_prices
    WHERE pool = {pool: String} AND timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
    GROUP BY datetime, pool, token0, token1
    ORDER BY datetime DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    datetime,
    CONCAT(
        (
            SELECT abi_hex_to_string(symbol_hex)
            FROM `{trc20Metadata_db}`.metadata_rpc
            WHERE contract = (SELECT DISTINCT token0 FROM ohlc)
        ),
        (
            SELECT abi_hex_to_string(symbol_hex)
            FROM `{trc20Metadata_db}`.metadata_rpc
            WHERE contract = (SELECT DISTINCT token1 FROM ohlc)
        )
    ) AS ticker,
    pool,
    if(is_stablecoin, 1/open_raw, open_raw) AS open,
    if(is_stablecoin, 1/low_raw, high_raw) AS high,
    if(is_stablecoin, 1/high_raw, low_raw) AS low,
    if(is_stablecoin, 1/close_raw, close_raw) AS close,
    volume,
    uaw,
    transactions
FROM ohlc
ORDER BY datetime DESC