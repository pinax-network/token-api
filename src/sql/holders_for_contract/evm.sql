WITH

balances AS (
    SELECT
        address,
        argMax(balance, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn
    FROM {db_balances:Identifier}.erc20_balances
    WHERE contract = {contract:String} AND balance > 0
    GROUP BY address
)
SELECT
    /* timestamps */
    max(b.ts) AS last_update,
    max(b.bn) AS last_update_block_num,
    toUnixTimestamp(max(b.ts)) AS last_update_timestamp,

    /* identifiers */
    b.address AS address,
    {contract:String} AS contract,

    toString(any(b.amt)) AS amount,
    any(b.amt) / pow(10, m.decimals) AS value,

    /* decimals and metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,

    /* network */
    {network:String} as network
FROM balances AS b
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND {contract:String} = m.contract
GROUP BY address, contract, m.name, m.symbol, m.decimals
ORDER BY value DESC, address
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
