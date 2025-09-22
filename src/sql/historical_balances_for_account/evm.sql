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
    FROM historical_balances
    WHERE address = {address: String}
        AND timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND ({contracts: Array(String)} = [] OR contract IN {contracts: Array(String)})
    GROUP BY datetime, contract
)
SELECT
    datetime,
    o.contract AS contract,
    name,
    symbol,
    decimals,
    open_raw / pow(10, decimals) AS open,
    greatest(high_raw, open_raw, close_raw) / pow(10, decimals) AS high,
    least(low_raw, open_raw, close_raw) / pow(10, decimals) AS low,
    close_raw / pow(10, decimals) AS close,
    {network_id: String} as network_id
FROM ohlc AS o
LEFT JOIN metadata AS c USING contract
ORDER BY datetime DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}
