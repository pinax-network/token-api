SELECT
    block_num,
    toUnixTimestamp(timestamp) as timestamp,
    date,
    contract,
    from,
    to,
    CAST(value, 'String') AS value,
    contracts.decimals as decimals,
    contracts.symbol as symbol,
    {chain_id: String} as chain_id
FROM transfers
LEFT JOIN contracts
    ON transfers.contract = contracts.address
WHERE
    date >= Date(now()) - {age: Int} AND (from = {address: String} OR to = {address: String})
ORDER BY block_num DESC;