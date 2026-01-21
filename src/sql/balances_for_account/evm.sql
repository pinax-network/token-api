WITH filtered_balances AS (
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        address,
        contract,
        argMax(balance, b.timestamp) AS amount
    FROM {db_balances:Identifier}.erc20_balances AS b
    WHERE
        address IN {address:Array(String)}
        AND ({contract:Array(String)} = [''] OR contract IN {contract:Array(String)})
        AND (balance > 0 OR {include_null_balances:Bool})
    GROUP BY address, contract
    ORDER BY block_num DESC, address, contract
    LIMIT   {limit:UInt64}
    OFFSET  {offset:UInt64}
)
SELECT
    /* block */
    timestamp AS last_update,
    block_num AS last_update_block_num,
    toUnixTimestamp(a.timestamp) AS last_update_timestamp,

    /* identity */
    address AS address,
    contract AS contract,

    /* amounts */
    toString(amount) AS amount,
    a.amount / pow(10, decimals) AS value,

    /* metadata */
    name,
    symbol,
    decimals,

    /* network */
    {network:String} AS network
FROM filtered_balances AS a
LEFT JOIN metadata.metadata AS m ON m.network = {network:String} AND a.contract = m.contract
ORDER BY block_num DESC, address, contract
