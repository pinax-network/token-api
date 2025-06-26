WITH filtered_pools AS (
    SELECT
        block_num,
        timestamp as datetime,
        signature AS transaction_id,
        toString(user) AS creator,
        toString(amm) AS pool,
        coin_mint,
        pc_mint
    FROM raydium_amm_v4_initialize AS i
    WHERE
        if ({pool:String} == '', true, amm = {pool:String}) AND
        if ({creator:String} == '', true, user = {creator:String}) AND
        if ({token:String} == '', true, pc_mint = {token:String} OR coin_mint = {token:String})
)
SELECT
    pools.block_num AS block_num,
    datetime,
    transaction_id,
    creator,
    pool,
    CAST(
        ( toString(c0.mint), 'TO IMPLEMENT', c0.decimals )
        AS Tuple(address String, symbol  String, decimals UInt8)
    ) AS token0,
    CAST(
        ( toString(c1.mint), 'TO IMPLEMENT', c1.decimals )
        AS Tuple(address String, symbol  String, decimals UInt8)
    ) AS token1,
    {network_id: String} as network_id
FROM filtered_pools AS pools
JOIN mints AS c0 ON c0.mint = pools.coin_mint
JOIN mints AS c1 ON c1.mint = pools.pc_mint
ORDER BY datetime DESC
LIMIT   {limit:int}
OFFSET  {offset:int}