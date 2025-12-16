WITH output_pools AS (
    SELECT DISTINCT pool
    FROM state_pools_aggregating_by_token
    WHERE token IN {output_token:Array(String)}
),
input_pools AS (
    SELECT DISTINCT pool
    FROM state_pools_aggregating_by_token
    WHERE token IN {input_token:Array(String)}
),
pools AS (
    SELECT
        pool,
        factory,
        protocol,
        sum(transactions) as transactions,
        uniqMerge(uniq_tx_from) as uaw
    FROM state_pools_aggregating_by_pool
    WHERE
        ({input_token:Array(String)} = [''] OR pool IN input_pools)
    AND ({output_token:Array(String)} = [''] OR pool IN output_pools)
    AND ({pool:Array(String)} = [''] OR pool IN {pool:Array(String)})
    AND ({factory:Array(String)} = [''] OR factory IN {factory:Array(String)})
    AND ({protocol:String} = '' OR toString(protocol) = {protocol:String})
    GROUP BY pool, factory, protocol
    ORDER BY transactions DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
pools_with_tokens AS (
    SELECT
        pool,
        factory,
        protocol,
        arraySort(groupArrayDistinct(token)) as tokens,
        arrayElement(tokens, 1) AS token0,
        arrayElement(tokens, 2) AS token1

    FROM pools AS p
    JOIN state_pools_aggregating_by_token AS pt ON p.pool = pt.pool
    GROUP BY pool, factory, protocol
)
SELECT
    /* initialize */
    i.block_num AS block_num,
    i.timestamp AS datetime,
    toUnixTimestamp(i.timestamp) AS timestamp,
    i.tx_hash AS transaction_id,

    /* DEX */
    p.pool AS pool,
    p.factory AS factory,
    p.protocol AS protocol,

    /* tokens */
    CAST ((
        pt.token0,
        m0.symbol,
        m0.decimals
    ) AS Tuple(address String, symbol String, decimals UInt8)) AS input_token,

    CAST ((
        pt.token1,
        m1.symbol,
        m1.decimals
    ) AS Tuple(address String, symbol String, decimals UInt8)) AS output_token,

    /* stats */
    p.transactions AS transactions,
    p.uaw AS uaw,

    /* Fees */
    f.fee AS fee
FROM pools AS p
JOIN state_pools_initialize AS i ON p.pool = i.pool
JOIN state_pools_fees AS f ON p.pool = f.pool
JOIN pools_with_tokens AS pt ON p.pool = pt.pool
JOIN metadata AS m0 ON pt.token0 = m0.contract
JOIN metadata AS m1 ON pt.token1 = m1.contract
ORDER BY p.transactions DESC