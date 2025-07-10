SELECT
    max(block_num) as block_num,
    max(timestamp) as datetime,
    contract,
    decimals,
    trim(symbol) as symbol,
    name,
    sum(latest_balance) as circulating_supply,
    countIf(latest_balance > 0) as holders,
    {network_id: String} as network_id
FROM (
    SELECT 
        contract,
        address,
        argMax(balance, b.block_num) as latest_balance,
        argMax(decimals, b.block_num) as decimals,
        argMax(symbol, b.block_num) as symbol,
        argMax(name, b.block_num) as name,
        max(block_num) as block_num,
        max(timestamp) as timestamp
    FROM balances_by_contract AS b
    WHERE contract = {contract: String}
    GROUP BY contract, address
) latest_balances
GROUP BY contract, decimals, symbol, name;