WITH has_pools AS (
    SELECT DISTINCT pool
    FROM state_pools_aggregating_by_token
    WHERE
        token IN {input_token:Array(String)} OR
        token IN {output_token:Array(String)}
)
SELECT
    /* DEX identity */
    p.factory AS factory,
    p.pool AS pool,

    /* initialize */
    initialize_block_num AS block_num,
    initialize_timestamp AS datetime,
    initialize_tx_hash AS transaction_id,

    /* tokens */
    CAST ((
        arrayElement(pt.tokens, 1),
        m1.symbol,
        m1.decimals
    ) AS Tuple(address String, symbol String, decimals UInt8)) AS input_token,
    CAST ((
        arrayElement(pt.tokens, 2),
        m2.symbol,
        m2.decimals
    ) AS Tuple(address String, symbol String, decimals UInt8)) AS output_token,

    fee,
    toString(protocol) AS protocol,
    {network:String} AS network

FROM pools AS p
WHERE
    ({input_token:Array(String)} = [''] OR p.pool IN has_pools)
AND ({output_token:Array(String)} = [''] OR p.pool IN has_pools)
AND ({pool:Array(String)} = [''] OR pool IN {pool:Array(String)})
AND ({factory:Array(String)} = [''] OR factory IN {factory:Array(String)})
AND ({protocol:String} = '' OR toString(protocol) = {protocol:String})
AND ({input_token:Array(String)} = [''] OR arrayElement(pt.tokens, 1) IN {input_token:Array(String)})
AND ({output_token:Array(String)} = [''] OR arrayElement(pt.tokens, 2) IN {output_token:Array(String)})

LEFT JOIN pools_tokens AS pt ON pt.pool = p.pool
LEFT JOIN metadata AS m1 ON arrayElement(pt.tokens, 1) = m1.contract
LEFT JOIN metadata AS m2 ON arrayElement(pt.tokens, 2) = m2.contract

ORDER BY p.transactions DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}
