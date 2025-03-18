SELECT
    block_num,
    toUnixTimestamp(timestamp) as timestamp,
    date,
    owner as address,
    CAST(new_balance, 'String') AS amount,
    multiIf(
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND chain_id IN ('mainnet','arbitrum-one','base','bnb','matic'), 18,
        contracts.decimals
    ) AS decimals,
    multiIf(
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND chain_id = 'mainnet', 'ETH',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND chain_id = 'arbitrum-one', 'ETH',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND chain_id = 'base', 'ETH',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND chain_id = 'bnb', 'BNB',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND chain_id = 'matic', 'POL',
        contracts.symbol
    ) AS symbol,
    {chain_id: String} as chain_id
FROM balances_by_contract FINAL
LEFT JOIN contracts
    ON balances.contract = contracts.address
WHERE
    contract = {contract: String} AND new_balance > 0
ORDER BY new_balance DESC;