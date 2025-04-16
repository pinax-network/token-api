SELECT
    block_num,
    timestamp as datetime,
    address,
    CAST(new_balance, 'String') AS amount,
    decimals,
    trim(symbol) as symbol,
    {network_id: String} as network_id
FROM balances_by_contract FINAL
LEFT JOIN contracts
    ON balances_by_contract.contract = contracts.address
WHERE
    contract = {contract: String} AND new_balance > 0
ORDER BY new_balance * if({order_by: String} = 'desc', -1, 1) ASC;
