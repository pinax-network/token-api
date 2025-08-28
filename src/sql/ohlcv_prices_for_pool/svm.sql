WITH mint0 AS (SELECT mint, decimals
               FROM `solana:solana-tokens@v0.2.3`.initialize_mint),
     mint1 AS (SELECT mint, decimals
               FROM `solana:solana-tokens@v0.2.3`.initialize_mint)
SELECT
    if(
        toTime(toStartOfInterval(o.timestamp, INTERVAL {interval: UInt64} MINUTE)) = toDateTime('1970-01-02 00:00:00'),
        toDate(toStartOfInterval(o.timestamp, INTERVAL {interval: UInt64} MINUTE)),
        toStartOfInterval(o.timestamp, INTERVAL {interval: UInt64} MINUTE)
    ) AS datetime,

    o.amm_pool AS pool,
    o.mint0    AS token0,
    o.mint1    AS token1,

    floor(argMinMerge(open0) * pow(10, any(m0.decimals) - any(m1.decimals)), 2) AS open,
    floor(quantileDeterministicMerge(0.99)(quantile0) * pow(10, any(m0.decimals) - any(m1.decimals)), 2)  AS high,
    floor(quantileDeterministicMerge(0.01)(quantile0) * pow(10, any(m0.decimals) - any(m1.decimals)), 2)  AS low,
    floor(argMaxMerge(close0) * pow(10, any(m0.decimals) - any(m1.decimals)), 2)                          AS close,

    floor(sum(gross_volume0) / pow(10, any(m0.decimals)), 2)         AS volume0,
    floor(sum(gross_volume1) / pow(10, any(m1.decimals)), 2)         AS volume1,
    floor(sum(net_flow0) / pow(10, any(m0.decimals)), 2)             AS netflow0,
    floor(sum(net_flow1) / pow(10, any(m1.decimals)), 2)             AS netflow1

FROM ohlc_prices AS o
    JOIN mint0 m0 USING mint0 AS mint
    JOIN mint1 m1 USING mint1 AS mint
WHERE   pool = {pool: String}
    AND timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
GROUP BY token0, token1, amm_pool, datetime
ORDER BY datetime DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}
