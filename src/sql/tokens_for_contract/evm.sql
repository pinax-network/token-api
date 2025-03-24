SELECT
    max(date) as date,
    max(timestamp) as timestamp,
    max(block_num) as block_num,
    contract as address,
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
    multiIf(
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'mainnet', 'Ethereum',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'arbitrum-one', 'Arbitrum One',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'base', 'Base',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'bnb', 'BNB',
        contract IN ('native', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') AND network_id = 'matic', 'Polygon',
        trim(contracts.name)
    ) AS name,
    {network_id: String} as network_id,
    CAST(sum(new_balance), 'String') as total_supply,
    count() as holders
FROM balances_by_contract FINAL
LEFT JOIN contracts
    ON balances_by_contract.contract = contracts.address
WHERE
    contract = {contract: String} AND new_balance > 0
GROUP BY contract, symbol, name, decimals
