WITH filtered_balances AS (
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        address,
        contract,
        argMax(balance, b.timestamp) AS amount
    FROM balances AS b
    WHERE
        address IN {address:Array(String)}
        AND contract != '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        AND ({contract:Array(String)} = [''] OR contract IN {contract:Array(String)})
        AND (balance > 0 OR {include_null_balances:Bool})
    GROUP BY address, contract
    ORDER BY timestamp DESC, address, contract
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
    name,
    symbol,
    decimals,
    {network:String} AS network
FROM filtered_balances AS a
LEFT JOIN metadata AS b USING contract
ORDER BY timestamp DESC, address, contract