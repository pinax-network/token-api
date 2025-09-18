SELECT
    toString(program_id) AS program_id,
    program_names(program_id) AS program_name,
    toString(amm) AS amm,
    program_names(amm) AS amm_name,
    IF(program_id = amm, false, true) AS is_aggregator,
    sum(transactions) AS total_transactions
FROM pool_activity_summary
WHERE ({program_id:String} = '' OR program_id = {program_id:String})
    AND ({amm:String} = '' OR amm = {amm:String})
GROUP BY
    program_id,
    amm
ORDER BY total_transactions DESC
LIMIT   {limit:UInt64}
OFFSET  {offset:UInt64}