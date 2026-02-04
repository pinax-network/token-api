SELECT
    /* timestamps */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* identifiers */
    b.address,

    /* amounts */
    toString(b.balance) AS amount,
    b.balance / pow(10, m.decimals) AS value,

    /* decimals and metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,

    /* network */
    {network:String} as network
FROM {db_balances:Identifier}.native_balances_final as b
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND '0x0000000000000000000000000000000000000000' = m.contract
ORDER BY b.balance DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
