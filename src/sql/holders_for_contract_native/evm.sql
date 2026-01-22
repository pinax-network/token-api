WITH balances AS (
    SELECT
        address,
        max(timestamp) AS timestamp,
        max(b.block_num) AS block_num,
        argMax(b.balance, b.block_num) AS balance
    FROM {db_balances:Identifier}.native_balances AS b
    GROUP BY address
    /* drop small holders here (also drops 0 if min_balance > 0) */
    HAVING balance > 1
)
SELECT
    /* timestamps */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* identifiers */
    b.address AS address,

    /* amounts */
    toString(b.balance) AS amount,
    b.balance / pow(10, decimals) AS value,

    /* metadata */
    name,
    symbol,
    decimals,

    /* network */
    {network:String} as network
FROM balances AS b
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = '0x0000000000000000000000000000000000000000'
ORDER BY b.balance DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}