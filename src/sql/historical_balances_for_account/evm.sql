WITH
ohlc AS (
    SELECT
        contract,
        if(
            toTime(toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)),
            toStartOfInterval(timestamp, INTERVAL {interval_minute: UInt64} MINUTE)
        ) AS datetime,
        toFloat64(argMinMerge(open)) AS open_raw,
        toFloat64(max(high)) AS high_raw,
        toFloat64(min(low)) AS low_raw,
        toFloat64(argMaxMerge(close)) AS close_raw
    FROM historical_balances
    WHERE address = {address: String} AND ({contracts: Array(String)} = [] OR contract IN {contracts: Array(String)})
    GROUP BY contract, datetime
    HAVING datetime >= parseDateTimeBestEffortOrZero({min_datetime: String}) 
       AND datetime <= parseDateTimeBestEffort({max_datetime: String})
    ORDER BY datetime DESC
)
SELECT
    datetime,
    name,
    symbol,
    decimals,
    {network_id: String} as network_id,
    open_raw * pow(10, -decimals) AS open,
    multiIf(
        high_raw < open_raw, open_raw,
        high_raw < close_raw, close_raw,
        high_raw
    ) * pow(10, -decimals) AS high,
    multiIf(
        low_raw > open_raw, open_raw,
        low_raw > close_raw, close_raw,
        low_raw
    ) * pow(10, -decimals) AS low,
    close_raw * pow(10, -decimals) AS close
FROM ohlc AS o
INNER JOIN contracts AS c FINAL ON o.contract = c.address;