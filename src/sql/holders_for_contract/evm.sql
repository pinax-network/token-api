WITH balances AS (
    SELECT
        address,
        contract,
        max(timestamp) AS timestamp,
        max(b.block_num) AS block_num,
        argMax(b.balance, b.block_num) AS balance
    FROM {db_balances:Identifier}.erc20_balances AS b
    PREWHERE contract IN {contract:String}
    GROUP BY contract, address
    /* drop small holders here (also drops 0 if min_balance > 0) */
    HAVING balance > 0
)
SELECT
    /* timestamps */
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,

    /* identifiers */
    b.address AS address,
    b.contract AS contract,

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
LEFT JOIN metadata.metadata AS m FINAL ON m.network = {network:String} AND b.contract = m.contract
ORDER BY b.balance DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}