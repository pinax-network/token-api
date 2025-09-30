WITH filtered_balances AS (
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        address,
        contract,
        argMax(balance, b.timestamp) AS amount
    FROM balances AS b
    WHERE
        (address = {address: String} AND balance > 0)
        AND ({contract: String} = '' OR contract = {contract: String})
    GROUP BY address, contract
    ORDER BY timestamp DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    block_num,
    timestamp AS last_balance_update,
    toString(contract) AS contract,
    toString(amount) AS amount,
    a.amount / pow(10, decimals) AS value,
    name,
    symbol,
    decimals,
    {network_id: String} AS network_id
FROM filtered_balances AS a
LEFT JOIN metadata_view AS b USING contract