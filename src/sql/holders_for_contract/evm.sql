SELECT
    block_num,
    toUnixTimestamp(timestamp) as timestamp,
    date,
    owner as address,
    CAST(new_balance, 'String') AS amount,
    contracts.decimals as decimals,
    contracts.symbol as symbol,
    {chain_id: String} as chain_id
FROM balances FINAL
LEFT JOIN contracts
    ON balances.contract = contracts.address
WHERE
    contract = {contract: String} AND new_balance > 0
ORDER BY amount DESC;