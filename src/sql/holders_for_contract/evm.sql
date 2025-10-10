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
    timestamp AS last_update,
    block_num AS last_update_block_num,
    toUnixTimestamp(a.timestamp) AS last_update_timestamp,
    toString(address) AS address,
    toString(contract) AS contract,
    toString(amount) AS amount,
    a.amount / pow(10, decimals) AS value,
    value,
    name,
    symbol,
    decimals,
    {network:String} as network
FROM filtered_balances AS a
LEFT JOIN metadata AS b USING contract
ORDER BY amount DESC