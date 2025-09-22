WITH m AS (
    SELECT
        symbol,
        name,
        decimals
    FROM metadata
    WHERE contract = {contract: String}
), s AS (
    SELECT
        argMax(total_supply, block_num) AS total_supply
    FROM total_supply
    WHERE contract = {contract: String}
    GROUP BY contract
), b AS (
    SELECT
        count(address) AS holders,
        sum(balance) AS raw_circulating_supply,
        max(block_num) AS block_num,
        max(timestamp) AS timestamp
    FROM (
        SELECT
            address,
            contract,
            max(block_num) AS block_num,
            max(timestamp) AS timestamp,
            argMax(balance, t.block_num) AS balance
        FROM balances AS t
        WHERE contract = {contract: String}
        GROUP BY
            contract,
            address
        HAVING balance > 0
    )
    GROUP BY contract
)
SELECT
    b.timestamp AS last_update,
    b.block_num AS last_update_block_num,
    toUnixTimestamp(b.timestamp) AS last_update_timestamp,
    {contract: String} AS contract,
    name,
    symbol,
    decimals,
    b.raw_circulating_supply / pow(10, decimals) AS circulating_supply,
    s.total_supply / pow(10, decimals) AS total_supply,
    b.holders AS holders,
    {network_id: String} AS network_id
FROM b
LEFT JOIN m ON 1 = 1
LEFT JOIN s ON 1 = 1