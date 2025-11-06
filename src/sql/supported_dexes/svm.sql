SELECT
    toString(program_id) AS program_id,
    program_names(p.program_id) AS program_name,
    toString(amm) AS amm,
    program_names(p.amm) AS amm_name,
    IF(program_id = amm, false, true) AS is_aggregator,
    sum(transactions) AS transactions
FROM pool_activity_summary AS p
GROUP BY
    p.program_id,
    p.amm
ORDER BY transactions DESC, program_id, amm