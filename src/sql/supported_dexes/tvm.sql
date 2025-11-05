WITH all_dexes AS (
    SELECT
        factory,
        protocol,
        sum(transactions) as transactions,
        uniqMerge(uaw) as uaw,
        max(timestamp) as last_activity
    FROM ohlc_prices
    WHERE interval_min = 1440
    GROUP BY
        protocol,
        factory
)
SELECT * FROM all_dexes
WHERE ({factory:Array(String)} = [''] OR factory IN {factory:Array(String)})
AND ({protocol:String} = '' OR protocol IN {protocol:String})
ORDER BY transactions DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}