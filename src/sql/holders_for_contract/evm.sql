/* 0) Get the token metadata */
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
/* 1) Get the cutoff for native token - 100 by default, pick optimal number by chain based token value and activity */
/* With optimal cutoff number, distinct holders with that cutoff should be at least 1000, but reasonable for the query performance: */
/* SELECT countDistinct(address) FROM balances WHERE contract = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' AND balance > N * pow(10, 18); */
cutoff AS (
    SELECT
        multiIf(
            {network: String} = 'unichain', toUInt64(1),
            {network: String} = 'optimism', toUInt64(10),
            {network: String} = 'base', toUInt64(10),
            {network: String} = 'arbitrum-one', toUInt64(100),
            {network: String} = 'bsc', toUInt64(100),
            {network: String} = 'avalanche', toUInt64(1000),
            {network: String} = 'mainnet', toUInt64(5000),
            {network: String} = 'polygon', toUInt64(50000),
            toUInt64(100)
        ) AS eth_cut
),
/* 2) Branch if it's a native token with cutoff */
top_native AS (
    SELECT
        address,
        argMax(balance, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        any(contract) AS cnt
    FROM balances
    WHERE {contract: String} = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' AND contract = {contract: String}
      AND balance > (SELECT eth_cut FROM cutoff) * pow(10,18)
    GROUP BY address
),
/* 3) Branch if it's an ERC20 token - no cut off */
top_erc20 AS (
    SELECT
        address,
        argMax(balance, timestamp) AS amt,
        max(timestamp) AS ts,
        max(block_num) AS bn,
        any(contract) AS cnt
    FROM balances
    WHERE {contract: String} != '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' AND contract = {contract: String}
      AND balance > 0
    GROUP BY address
),
top_balances AS (
    SELECT address, amt, ts, bn, cnt AS contract
    FROM top_native
    UNION ALL
    SELECT address, amt, ts, bn, cnt AS contract
    FROM top_erc20
)
SELECT
    ts AS last_update,
    bn AS last_update_block_num,
    toUnixTimestamp(ts) AS last_update_timestamp,
    toString(address) AS address,
    toString(contract) AS contract,
    toString(amt) AS amount,
    amt / pow(10, decimals) AS value,
    name,
    symbol,
    decimals,
    {network:String} as network
FROM top_balances
LEFT JOIN metadata USING contract
ORDER BY value DESC, address
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}
