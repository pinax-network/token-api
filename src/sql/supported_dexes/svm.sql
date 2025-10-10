SELECT
    toString(program_id) AS program_id,
    program_names(p.program_id) AS program_name,
    toString(amm) AS amm,
    program_names(p.amm) AS amm_name,
    IF(program_id = amm, false, true) AS is_aggregator,
    sum(transactions) AS total_transactions
FROM pool_activity_summary AS p
WHERE ({program_id:Array(String)} = [''] OR program_id IN {program_id:Array(String)})
    AND ({amm:Array(String)} = [''] OR amm IN {amm:Array(String)})
GROUP BY
    p.program_id,
    p.amm
ORDER BY total_transactions DESC, program_id, amm
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}