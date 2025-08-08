WITH filtered_balances AS (
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        address,
        contract,
        toString(argMax(balance_raw, b.timestamp)) AS amount,
        argMax(balance, b.timestamp) AS value,
        name,
        symbol,
        decimals
    FROM balances AS b
    WHERE
        (address = {address: String} AND balance_raw > 0)
        AND ({contract: String} = '' OR contract = {contract: String})
    GROUP BY address, contract, name, symbol, decimals
    ORDER BY timestamp DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    block_num,
    timestamp as last_balance_update,
    toString(contract) as contract,
    amount,
    value,
    COALESCE(b.name, a.name) as name,
    trim(COALESCE(b.symbol, a.symbol)) as symbol,
    COALESCE(b.decimals, a.decimals) as decimals,
    {network_id: String} as network_id
FROM filtered_balances AS a
LEFT JOIN erc20_metadata_initialize AS b ON a.contract = b.address