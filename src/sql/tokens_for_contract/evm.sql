SELECT
    max(block_num) as block_num,
    max(timestamp) as datetime,
    contract as address,
    decimals,
    trim(symbol) as symbol,
    name,
    toString(sum(balance)) as circulating_supply,
    count() as holders,
    {network_id: String} as network_id
FROM balances_by_contract
FINAL
JOIN erc20_metadata_initialize
    ON balances_by_contract.contract = erc20_metadata_initialize.address
WHERE
    contract = {contract: String} AND balance > 0
GROUP BY contract, symbol, name, decimals
LIMIT   {limit:int}
OFFSET  {offset:int}
