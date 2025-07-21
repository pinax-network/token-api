WITH
ohlc AS (
    SELECT
        contract,
        name,
        symbol,
        decimals,
        if(
            toTime(toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
            toDate(toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)),
            toStartOfInterval(timestamp, INTERVAL {interval: UInt64} MINUTE)
        ) AS datetime,
        toFloat64(argMinMerge(open)) AS open_raw,
        toFloat64(max(high)) AS high_raw,
        toFloat64(min(low)) AS low_raw,
        toFloat64(argMaxMerge(close)) AS close_raw
    FROM historical_balances
    WHERE address = {address: String} AND ({contracts: Array(String)} = [] OR contract IN {contracts: Array(String)})
    GROUP BY datetime, contract, name, symbol, decimals
    HAVING datetime >= parseDateTimeBestEffortOrZero({startTime: String})
       AND datetime <= parseDateTimeBestEffort({endTime: String})
)
SELECT
    datetime,
    o.contract AS contract,
    COALESCE(c.name, o.name) as name,
    trim(COALESCE(c.symbol, o.symbol)) as symbol,
    COALESCE(c.decimals, o.decimals) as decimals,
    open_raw AS open,
    multiIf(
        high_raw < open_raw, open_raw,
        high_raw < close_raw, close_raw,
        high_raw
    ) AS high,
    multiIf(
        low_raw > open_raw, open_raw,
        low_raw > close_raw, close_raw,
        low_raw
    ) AS low,
    close_raw AS close,
    {network_id: String} as network_id
FROM ohlc AS o
LEFT JOIN erc20_metadata_initialize AS c ON o.contract = c.address
ORDER BY datetime DESC
LIMIT   {limit:int}
OFFSET  {offset:int}
