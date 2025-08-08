WITH filtered_balances AS (
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        address,
        contract,
        toString(argMax(balance_raw, b.timestamp)) AS amount,
        argMax(balance, b.timestamp) AS value
    FROM balances_by_contract AS b
    WHERE
        contract = {contract: String} AND balance_raw > 0
    GROUP BY contract, address
    ORDER BY value DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    block_num,
    timestamp as last_balance_update,
    address,
    amount,
    value,
    name,
    decimals,
    trim(symbol) as symbol,
    {network_id: String} as network_id
FROM filtered_balances AS a
JOIN erc20_metadata_initialize AS b ON a.contract = b.address