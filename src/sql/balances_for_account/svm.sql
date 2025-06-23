SELECT
    block_num,
    timestamp as datetime,
    toString(program_id) AS program,
    toString(mint) AS contract,
    amount,
    amount / pow(10, decimals) as value,
    decimals,
    {network_id: String} as network_id
FROM balances FINAL
WHERE
    (owner = {address: String} AND amount > 0)
    AND ({contract: String} = '' OR mint = {contract: String})
ORDER BY timestamp DESC
LIMIT {limit:int}
OFFSET {offset:int}