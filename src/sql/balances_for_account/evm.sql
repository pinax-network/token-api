SELECT
    block_num,
    timestamp as datetime,
    toString(contract) AS contract,
    toString(new_balance) AS amount,
    new_balance / pow(10, decimals) as value,
    decimals,
    trim(symbol) as symbol,
    {network_id: String} as network_id
FROM balances FINAL
JOIN contracts
    ON balances.contract = contracts.address
WHERE
    (address = {address: String} AND new_balance > 0)
    AND ({contract: String} = '' OR contract = {contract: String})
ORDER BY timestamp DESC
LIMIT   {limit:int}
OFFSET  {offset:int}