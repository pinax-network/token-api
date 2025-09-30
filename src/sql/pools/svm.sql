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
    WHERE ({amm:Array(String)} = [''] OR amm IN {amm:Array(String)})
        AND ({amm_pool:Array(String)} = [''] OR amm_pool IN {amm_pool:Array(String)})
        AND ({input_mint:Array(String)} = [''] OR mint1 IN {input_mint:Array(String)})
        AND ({output_mint:Array(String)} = [''] OR mint0 IN {output_mint:Array(String)})
        AND ({program_id:Array(String)} = [''] OR program_id IN {program_id:Array(String)})
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
    {network:String} AS network
FROM filtered_pools AS pools
GROUP BY program_id, program_name, amm, amm_name, amm_pool, input_mint, output_mint
ORDER BY program_id, amm, transactions DESC, amm_pool
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}