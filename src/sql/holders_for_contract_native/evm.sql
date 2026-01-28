WITH balances AS (
    SELECT
        address,
        timestamp,
        block_num,
        balance
    FROM {db_balances:Identifier}.native_balances FINAL
    WHERE balance != 0
)
SELECT
    /* timestamps */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* identifiers */
    address,

    /* amounts */
    toString(balance) AS amount,
    balance / pow(10, m.decimals) AS value,

    /* decimals and metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,

    /* network */
    {network:String} as network
FROM balances AS b
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND '0x0000000000000000000000000000000000000000' = m.contract
ORDER BY value DESC, address
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
