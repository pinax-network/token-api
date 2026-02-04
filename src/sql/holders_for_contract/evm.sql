SELECT
    /* timestamps */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* identifiers */
    b.address AS address,
    {contract:String} AS contract,

    /* amounts */
    toString(b.balance) AS amount,
    b.balance / pow(10, m.decimals) AS value,

    /* decimals and metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,

    /* network */
    {network:String} as network
FROM {db_balances:Identifier}.erc20_balances_final AS b
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND m.contract = {contract:String}
WHERE b.contract = {contract:String}
ORDER BY b.balance DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}