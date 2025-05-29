SELECT
    block_num,
    timestamp as datetime,
    toString(contract) AS contract,
    toString(balance_raw) AS amount,
    balance as value,
    decimals,
    trim(symbol) as symbol,
    {network_id: String} as network_id
FROM balances FINAL
WHERE
    (address = {address: String} AND balance_raw > 0)
    AND ({contract: String} = '' OR contract = {contract: String})
ORDER BY timestamp DESC
LIMIT   {limit:int}
OFFSET  {offset:int}