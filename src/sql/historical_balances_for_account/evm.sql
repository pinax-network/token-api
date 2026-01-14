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
    FROM {db_balances:Identifier}.historical_balances
    WHERE
        address = {address:String}
        AND timestamp BETWEEN {start_time:UInt64} AND {end_time:UInt64}
        AND ({contract:Array(String)} = [''] OR contract IN {contract:Array(String)})
    GROUP BY datetime, contract
    ORDER BY datetime DESC, contract
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
),
metadata AS
(
    SELECT
        contract,
        name,
        if(
            contract = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            multiIf(
                {network:String} = 'mainnet', 'ETH',
                {network:String} = 'arbitrum-one', 'ETH',
                {network:String} = 'avalanche', 'AVAX',
                {network:String} = 'base', 'ETH',
                {network:String} = 'bsc', 'BNB',
                {network:String} = 'polygon', 'POL',
                {network:String} = 'optimism', 'ETH',
                {network:String} = 'unichain', 'ETH',
                ''
            ),
            mv.symbol
        ) AS symbol,
        decimals
    FROM {db_metadata:Identifier}.metadata_view AS mv
    WHERE contract IN (
        SELECT contract
        FROM ohlc
    )
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
LEFT JOIN metadata AS c USING contract
ORDER BY datetime DESC, contract
