SELECT
    block_num,
    toUnixTimestamp(timestamp) as timestamp,
    date,
    CAST(contract, 'String') AS contract,
    from,
    to,
    CAST(value, 'String') AS amount,
    multiIf(
        contract = 'native' AND chain_id IN ('mainnet','arbitrum-one','base','bnb','matic'), 18,
        contracts.decimals
    ) AS decimals,
    multiIf(
        contract = 'native' AND chain_id = 'mainnet', 'ETH',
        contract = 'native' AND chain_id = 'arbitrum-one', 'ETH',
        contract = 'native' AND chain_id = 'base', 'ETH',
        contract = 'native' AND chain_id = 'bnb', 'BNB',
        contract = 'native' AND chain_id = 'matic', 'POL',
        contracts.symbol
    ) AS symbol,
    {chain_id: String} as chain_id
FROM transfers
LEFT JOIN contracts
    ON transfers.contract = contracts.address
WHERE
    date >= Date(now()) - {age: Int} AND (from = {address: String} OR to = {address: String})
ORDER BY block_num DESC;
