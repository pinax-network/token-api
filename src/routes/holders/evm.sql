/* get the latest balance for each account */
WITH balances AS (
    SELECT address, contract, balance, timestamp, block_num
    FROM {db_balances:Identifier}.erc20_balances FINAL
    WHERE contract = {contract:String} AND balance > 0
    ORDER BY balance DESC, address
    LIMIT {limit:UInt64}
    OFFSET {offset:UInt64}
)
SELECT
    /* timestamps */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* identifiers */
    address,
    contract,

    /* amounts */
    toString(b.balance) AS amount,
    b.balance / pow(10, m.decimals) AS value,

    /* decimals and metadata */
    m.name AS name,
    m.symbol AS symbol,
    m.decimals AS decimals,

    /* network */
    {network:String} as network
FROM balances b
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND {contract:String} = m.contract
ORDER BY b.balance DESC, address
