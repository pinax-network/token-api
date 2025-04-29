SELECT
    max(block_num) as block_num,
    max(timestamp) as datetime,
    contract as address,
    decimals,
    trim(symbol) as symbol,
    name,
    toString(sum(new_balance)) as circulating_supply,
    count() as holders,
    {network_id: String} as network_id
FROM balances_by_contract FINAL
JOIN contracts
    ON balances_by_contract.contract = contracts.address
WHERE
    contract = {contract: String} AND new_balance > 0
GROUP BY contract, symbol, name, decimals
LIMIT   {limit:int}
OFFSET  {offset:int}
