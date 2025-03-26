SELECT
    block_num,
    toUnixTimestamp(timestamp) as timestamp,
    date,
    CAST(contract, 'String') AS contract,
    CAST(new_balance, 'String') AS amount,
    {network_id: String} as network_id,
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
        trim(contracts.symbol)
    ) AS symbol
FROM balances FINAL
LEFT JOIN contracts
    ON balances.contract = contracts.address
WHERE
    (owner = {address: String} AND new_balance > 0)
    AND ({contract: String} = '' OR contract = {contract: String})
ORDER BY block_num DESC;