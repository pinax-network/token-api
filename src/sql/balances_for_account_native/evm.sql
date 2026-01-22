WITH filtered_balances AS (
    SELECT
        max(block_num) AS block_num,
        max(timestamp) AS timestamp,
        address,
        argMax(balance, b.timestamp) AS amount
    FROM {db_balances:Identifier}.erc20_balances AS b
    WHERE
        address IN {address:Array(String)}
        AND (balance > 0 OR {include_null_balances:Bool})
    GROUP BY address
    ORDER BY block_num DESC
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
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = '0x0000000000000000000000000000000000000000'
ORDER BY block_num DESC
