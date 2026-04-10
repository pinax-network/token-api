/* Apply cutoff if >10K balances exists for the contract, otherwise must be non-zero */
/* Cutoff is 0.01% of the max balance */
WITH cutoff AS (
    SELECT IF (count() > 10000, toUInt256(max(balance)) / 10000, 0)
    FROM {db_balances:Identifier}.erc20_balances WHERE contract = {contract:String}
),
/* get the latest balance for each account */
balances AS (
    SELECT address, contract, balance, timestamp, block_num
    FROM {db_balances:Identifier}.erc20_balances FINAL
    WHERE contract = {contract:String} AND balance > (SELECT * FROM cutoff)
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
SETTINGS use_skip_indexes_for_top_k = 1, use_top_k_dynamic_filtering = 1
