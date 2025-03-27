SELECT
    block_num,
    timestamp as datetime,
    date,
    CAST(contract, 'String') AS contract,
    CAST(new_balance, 'String') AS amount,
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
    ) AS symbol,
    {network_id: String} as network_id
FROM balances FINAL
LEFT JOIN contracts
    ON balances.contract = contracts.address
WHERE
    (owner = {address: String} AND new_balance > 0)
    AND ({contract: String} = '' OR contract = {contract: String})
ORDER BY block_num DESC;