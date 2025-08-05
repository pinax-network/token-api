WITH filtered_pools AS (
    SELECT
        program_id,
        program_name,
        amm,
        amm_name,
        amm_pool,
        mint0,
        mint0_name,
        mint1,
        mint1_name,
        transactions
    FROM pool_activity_summary
    WHERE
        if ({program_id:String} == '', true, program_id = {program_id:String}) AND
        if ({amm:String} == '', true, amm = {amm:String}) AND
        if ({amm_pool:String} == '', true, amm_pool = {amm_pool:String}) AND
        if ({input_mint:String} == '', true, mint1 = {input_mint:String}) AND
        if ({output_mint:String} == '', true, mint0 = {output_mint:String})
)
SELECT
    toString(program_id) AS program_id,
    toString(program_name) AS program_name,
    toString(amm) AS amm,
    toString(amm_name) AS amm_name,
    toString(amm_pool) AS amm_pool,
    CAST(
        ( toString(mint1), toString(mint1_name) )
        AS Tuple(address String, symbol  String)
    ) AS input_mint,
    CAST(
        ( toString(mint0), toString(mint0_name) )
        AS Tuple(address String, symbol  String)
    ) AS output_mint,
    sum(transactions) AS transactions,
    {network_id: String} as network_id
FROM filtered_pools AS pools
GROUP BY program_id, program_name, amm, amm_name, amm_pool, input_mint, output_mint
ORDER BY amm, transactions DESC, amm_pool
LIMIT   {limit:int}
OFFSET  {offset:int}