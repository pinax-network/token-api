WITH
ohlc AS (
    SELECT
        contract,
        if(
            toTime(toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)),
            toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)
        ) AS datetime,
        argMin(open, timestamp) AS open_raw,
        max(high) AS high_raw,
        min(low) AS low_raw,
        argMax(close, timestamp) AS close_raw
    FROM {db_balances:Identifier}.historical_erc20_balances_state
    WHERE
        address = {address:String}
        AND timestamp BETWEEN {start_time:UInt64} AND {end_time:UInt64}
        AND ({contract:Array(String)} = [''] OR contract IN {contract:Array(String)})
    GROUP BY datetime, contract
    ORDER BY datetime DESC, contract
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    datetime,
    {address:String} AS address,
    o.contract AS contract,
    open_raw / pow(10, decimals) AS open,
    greatest(high_raw, open_raw, close_raw) / pow(10, decimals) AS high,
    least(low_raw, open_raw, close_raw) / pow(10, decimals) AS low,
    close_raw / pow(10, decimals) AS close,
    name,
    symbol,
    decimals,
    {network:String} AS network
FROM ohlc AS o
LEFT JOIN metadata.metadata AS m ON m.network = {network:String} AND o.contract = m.contract
ORDER BY datetime DESC, contract
