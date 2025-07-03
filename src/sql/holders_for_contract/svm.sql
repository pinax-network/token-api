SELECT
    block_num,
    timestamp as last_balance_update,
    toString(owner) AS owner,
    amount,
    toString(b.amount / pow(10, decimals)) as value,
    decimals,
    'TO IMPLEMENT' as symbol,
    {network_id: String} as network_id
FROM balances_by_mint AS b
FINAL
WHERE
    mint = {contract: String} AND amount > 0
ORDER BY value DESC
LIMIT   {limit:int}
OFFSET  {offset:int}