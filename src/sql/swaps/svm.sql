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
    WHERE program_id = {program_id:FixedString(44)}
    ORDER BY timestamp DESC
)
SELECT
    block_num,
    s.timestamp AS datetime,
    toUnixTimestamp(s.timestamp) AS timestamp,
    signature,
    trimRight(toString(program_id), char(0)) AS program_id,
    program_name,
    trimRight(toString(amm), char(0)) AS amm,
    amm_name
    amm_pool,
    user,
    trimRight(toString(input_mint), char(0)) AS input_mint,
    input_amount,
    trimRight(toString(output_mint), char(0)) AS output_mint,
    output_amount,
    {network_id: String} AS network_id
FROM s
WHERE s.timestamp BETWEEN {startTime:UInt32} AND {endTime:UInt32}
    AND ({signature:String}     = '' OR signature      = {signature:String})
    AND ({user:String}          = '' OR user           = {user:String})
    AND ({amm:String}           = '' OR amm            = {amm:String})
    AND ({amm_pool:String}      = '' OR amm_pool       = {amm_pool:String})
    AND ({input_mint:String}    = '' OR input_mint     = {input_mint:String})
    AND ({output_mint:String}   = '' OR output_mint    = {output_mint:String})
LIMIT   {limit:int}
OFFSET  {offset:int}