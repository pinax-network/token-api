WITH

balances AS (
    SELECT
        address,
        balance AS amt,
        timestamp AS ts,
        block_num AS bn
    FROM {db_balances:Identifier}.erc20_balances FINAL
    WHERE contract = {contract:String} AND balance > 0
    ORDER BY amt DESC, address
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    /* timestamps */
    b.ts AS last_update,
    b.bn AS last_update_block_num,
    toUnixTimestamp(b.ts) AS last_update_timestamp,

    /* identifiers */
    b.address AS address,
    {contract:String} AS contract,

    toString(b.amt) AS amount,
    b.amt / pow(10, m.decimals) AS value,

    /* decimals and metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,
    if(m.display_name != '', m.display_name, m.name) AS display_name,
    if(m.display_symbol != '', m.display_symbol, m.symbol) AS display_symbol,

    /* network */
    {network:String} as network
FROM balances AS b
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND {contract:String} = m.contract
ORDER BY value DESC, address