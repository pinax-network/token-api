WITH transfers AS (
    SELECT * FROM erc20_transfers
    UNION ALL
    SELECT * FROM native_transfers
)
SELECT
    block_num,
    timestamp as datetime,
    transaction_id,
    toString(contract) AS contract,
    from,
    to,
    toString(value) AS amount,
    value / pow(10, contracts.decimals) as value,
    contracts.decimals as decimals,
    trim(contracts.symbol) as symbol,
    {network_id: String} as network_id
FROM transfers
JOIN contracts
    ON contract = contracts.address
WHERE
    (timestamp >= now() - ({age: Int} * 86400) AND (from = {address: String} OR to = {address: String}))
    AND ({contract: String} = '' OR contract = {contract: String})
ORDER BY timestamp DESC;
