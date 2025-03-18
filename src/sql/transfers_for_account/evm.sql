SELECT
    block_num,
    toUnixTimestamp(timestamp) as timestamp,
    date,
    CAST(contract, 'String') AS contract,
    from,
    to,
    CAST(value, 'String') AS amount,
    multiIf(
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id IN ('mainnet','arbitrum-one','base','bnb','matic'), 18,
        contracts.decimals
    ) AS decimals,
    multiIf(
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'mainnet', 'ETH',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'arbitrum-one', 'ETH',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'base', 'ETH',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'bnb', 'BNB',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'matic', 'POL',
        contracts.symbol
    ) AS symbol,
    {network_id: String} as network_id
FROM transfers
LEFT JOIN contracts
    ON transfers.contract = contracts.address
WHERE
    (date >= Date(now()) - {age: Int} AND (from = {address: String} OR to = {address: String}))
    AND ({contract: String} = '' OR contract = {contract: String})
ORDER BY block_num DESC;
