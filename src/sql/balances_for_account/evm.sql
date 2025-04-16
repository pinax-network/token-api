SELECT
    block_num,
    timestamp as datetime,
    CAST(contract, 'String') AS contract,
    CAST(new_balance, 'String') AS amount,
    decimals,
    trim(symbol) as symbol,
    {network_id: String} as network_id
FROM balances FINAL
LEFT JOIN contracts
    ON balances.contract = contracts.address
WHERE
    (address = {address: String} AND new_balance > 0)
    AND ({contract: String} = '' OR contract = {contract: String})
ORDER BY block_num DESC;