WITH balances AS (
    SELECT
        address,
        timestamp,
        block_num,
        balance
    FROM {db_balances:Identifier}.erc20_balances AS b
    WHERE contract = {contract:String} AND balance != 0
)
SELECT
    /* timestamps */
    max(b.timestamp) AS last_update,
    max(b.block_num) AS last_update_block_num,
    toUnixTimestamp(max(b.timestamp)) AS last_update_timestamp,

    /* identifiers */
    b.address AS address,
    {contract:String} AS contract,

    /* amounts */
    toString(argMax(balance, b.block_num)) AS amount,
    argMax(balance, b.block_num) / pow(10, m.decimals) AS value,

    /* decimals and metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,

    /* network */
    {network:String} as network
FROM balances AS b
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND {contract:String} = m.contract
GROUP BY address, contract, m.name, m.symbol, m.decimals
ORDER BY value DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}