WITH filtered_balances AS (
    SELECT
        block_num,
        timestamp,
        address,
        balance
    FROM {db_balances:Identifier}.native_balances AS b FINAL
    WHERE address IN {address:Array(String)}
    ORDER BY block_num DESC
)
SELECT
    /* block */
    timestamp AS last_update,
    block_num AS last_update_block_num,
    toUnixTimestamp(a.timestamp) AS last_update_timestamp,

    /* identity */
    address AS address,

    /* amounts */
    toString(balance) AS amount,
    a.balance / pow(10, decimals) AS value,

    /* metadata */
    name,
    symbol,
    decimals,

    /* network */
    {network:String} AS network
FROM filtered_balances AS a
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = '0x0000000000000000000000000000000000000000'
ORDER BY block_num DESC
