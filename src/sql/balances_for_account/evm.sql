SELECT
    max(block_num) AS block_num,
    max(timestamp) AS datetime,
    toString(contract) AS contract,
    toString(argMax(balance_raw, timestamp)) AS amount,
    argMax(balance, timestamp) as value,
    decimals,
    trim(symbol) as symbol,
    {network_id: String} as network_id
FROM balances
WHERE
    (address = {address: String} AND balance_raw > 0)
    AND ({contract: String} = '' OR contract = {contract: String})
GROUP BY contract, symbol, decimals
ORDER BY datetime DESC
LIMIT   {limit:int}
OFFSET  {offset:int}