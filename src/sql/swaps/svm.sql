WITH s AS (
    SELECT
        block_num,
        timestamp,
        signature,
        program_id,
        program_name,
        amm,
        amm_name,
        amm_pool,
        user,
        input_mint,
        input_amount,
        output_mint,
        output_amount
    FROM swaps
    WHERE timestamp BETWEEN {startTime: UInt64} AND {endTime: UInt64}
        AND ({program_id:String}    = '' OR program_id     = {program_id:String})
        AND ({signature:String}     = '' OR signature      = {signature:String})
        AND ({user:String}          = '' OR user           = {user:String})
        AND ({amm:String}           = '' OR amm            = {amm:String})
        AND ({amm_pool:String}      = '' OR amm_pool       = {amm_pool:String})
        AND ({input_mint:String}    = '' OR input_mint     = {input_mint:String})
        AND ({output_mint:String}   = '' OR output_mint    = {output_mint:String})
)
SELECT
    block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,
    signature,
    toString(program_id) AS program_id,
    program_name,
    toString(amm) AS amm,
    amm_name,
    toString(amm_pool) AS amm_pool,
    user,
    toString(input_mint) AS input_mint,
    input_amount,
    toString(output_mint) AS output_mint,
    output_amount,
    {network_id: String} AS network_id
FROM s
ORDER BY timestamp DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}