WITH s AS (
    SELECT
        block_num,
        timestamp,
        signature,
        program_id,
        program_names(program_id) AS program_name,
        amm,
        amm_pool,
        user,
        input_mint,
        input_amount,
        output_mint,
        output_amount
    FROM swaps
    WHERE timestamp BETWEEN {start_time: UInt64} AND {end_time: UInt64}
        AND block_num BETWEEN {start_block: UInt64} AND {end_block: UInt64}
        AND ({signature:Array(String)}     = [''] OR signature      IN {signature:Array(String)})
        AND ({amm:Array(String)}           = [''] OR amm            IN {amm:Array(String)})
        AND ({amm_pool:Array(String)}      = [''] OR amm_pool       IN {amm_pool:Array(String)})
        AND ({user:Array(String)}          = [''] OR user           IN {user:Array(String)})
        AND ({input_mint:Array(String)}    = [''] OR input_mint     IN {input_mint:Array(String)})
        AND ({output_mint:Array(String)}   = [''] OR output_mint    IN {output_mint:Array(String)})
        AND ({program_id:Array(String)}    = [''] OR program_id     IN {program_id:Array(String)})
)
SELECT
    block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,
    signature,
    toString(program_id) AS program_id,
    program_name,
    toString(amm) AS amm,
    toString(amm_pool) AS amm_pool,
    user,
    toString(input_mint) AS input_mint,
    input_amount,
    toString(output_mint) AS output_mint,
    output_amount,
    {network:String} AS network
FROM s
ORDER BY timestamp DESC, program_id, amm, amm_pool
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}