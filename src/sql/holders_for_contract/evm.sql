/* 1) Get the token metadata */
WITH
metadata AS (
    SELECT
         contract,
         decimals,
         name,
         symbol
    FROM metadata_view
    WHERE contract = {contract: String}
),
/* 2) Branch if it's a native token - cut off at 100 ETH */
top_native AS (
    SELECT
        address,
        argMax(balance, timestamp) AS amount,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        any(contract) AS cnt
    FROM balances
    WHERE {contract: String} = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' AND contract = {contract: String}
      AND balance > 100 * pow(10,18)
    GROUP BY address
),
/* 3) Branch if it's an ERC20 token - no cut off */
top_erc20 AS (
    SELECT
        address,
        argMax(balance, timestamp) AS amount,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        any(contract) AS cnt
    FROM balances
    WHERE {contract: String} != '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' AND contract = {contract: String}
      AND balance > 0
    GROUP BY address
),
top_balances AS (
    SELECT address, amount, ts, bn, cnt AS contract
    FROM top_native
    UNION ALL
    SELECT address, amount, ts, bn, cnt AS contract
    FROM top_erc20
)
SELECT
    bn AS last_update_block_num,
    toUnixTimestamp(ts) AS last_update_timestamp,
    toString(address) AS address,
    contract,
    a.amount / pow(10, b.decimals) AS value,
    toString(a.amount) AS amount,
    b.name,
    b.symbol,
    b.decimals,
    {network:String} as network
FROM top_balances AS a
LEFT JOIN metadata AS b USING contract
ORDER BY value DESC, address
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
