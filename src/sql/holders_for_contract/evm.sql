SELECT
    block_num,
    timestamp as last_balance_update,
    address,
    toString(balance_raw) AS amount,
    balance as value,
    decimals,
    trim(symbol) as symbol,
    {network_id: String} as network_id
FROM balances_by_contract
FINAL
JOIN erc20_metadata_initialize
    ON balances_by_contract.contract = erc20_metadata_initialize.address
WHERE
    contract = {contract: String} AND balance_raw > 0
ORDER BY value DESC
LIMIT   {limit:int}
OFFSET  {offset:int}
