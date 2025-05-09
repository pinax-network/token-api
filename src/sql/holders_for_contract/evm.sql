SELECT
    block_num,
    timestamp as datetime,
    address,
    toString(new_balance) AS amount,
    new_balance / pow(10, decimals) as value,
    decimals,
    trim(symbol) as symbol,
    {network_id: String} as network_id
FROM balances_by_contract FINAL
JOIN contracts
    ON balances_by_contract.contract = contracts.address
WHERE
    contract = {contract: String} AND new_balance > 0
ORDER BY value DESC
LIMIT   {limit:int}
OFFSET  {offset:int}
