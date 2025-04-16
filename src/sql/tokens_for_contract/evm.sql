SELECT
    max(timestamp) as datetime,
    max(block_num) as block_num,
    contract as address,
    decimals,
    trim(symbol) as symbol,
    name,
    CAST(sum(new_balance), 'String') as circulating_supply,
    count() as holders,
    {network_id: String} as network_id
FROM balances_by_contract FINAL
LEFT JOIN contracts
    ON balances_by_contract.contract = contracts.address
WHERE
    contract = {contract: String} AND new_balance > 0
GROUP BY contract, symbol, name, decimals
