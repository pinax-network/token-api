WITH filtered_balances AS (
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        address,
        contract,
        argMax(balance, b.timestamp) AS amount
    FROM balances AS b
    WHERE
        contract = {contract: String}
    GROUP BY contract, address
    ORDER BY amount DESC
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
),
metadata AS
(
    SELECT
        contract,
        name,
        symbol,
        decimals
    FROM metadata_view
    WHERE contract IN (
        SELECT contract
        FROM filtered_balances
    )
)
SELECT
    block_num,
    timestamp as last_balance_update,
    toString(address) AS address,
    toString(amount) AS amount,
    a.amount / pow(10, decimals) AS value,
    value,
    name,
    symbol,
    decimals,
    {network_id: String} as network_id
FROM filtered_balances AS a
LEFT JOIN metadata AS b USING contract