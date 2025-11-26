WITH metadata AS (
    SELECT
        symbol,
        name,
        decimals
    FROM metadata_view
    WHERE contract = {contract: String}
),
total_supply AS (
    SELECT
        argMax(total_supply, block_num) AS total_supply
    FROM total_supply
    WHERE contract = {contract: String}
    GROUP BY contract
),
circulating AS (
    SELECT
        count() AS holders,
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
        GROUP BY contract, address
        HAVING balance > 0
    )
)
SELECT
    circulating.timestamp AS last_update,
    circulating.block_num AS last_update_block_num,
    toUnixTimestamp(circulating.timestamp) AS last_update_timestamp,
    {contract: String} AS contract,
    name,
    symbol,
    decimals,
    circulating.raw_circulating_supply / pow(10, decimals) AS circulating_supply,
    total_supply.total_supply / pow(10, decimals) AS total_supply,
    circulating.holders AS holders,
    {network: String} AS network
FROM circulating
LEFT JOIN metadata ON 1 = 1
LEFT JOIN total_supply ON 1 = 1
