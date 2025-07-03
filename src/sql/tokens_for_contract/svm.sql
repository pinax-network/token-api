SELECT
    max(block_num) AS block_num,
    max(timestamp) AS datetime,
    toString(mint) AS contract,
    decimals,
    'TO IMPLEMENT' AS symbol,
    'TO IMPLEMENT' AS name,
    toString(sum(amount) / pow(10, decimals)) AS circulating_supply,
    count() AS holders,
    {network_id: String} AS network_id
FROM balances_by_mint AS balances
FINAL
WHERE
    mint = {contract: String} AND amount > 0
GROUP BY mint, name, decimals
