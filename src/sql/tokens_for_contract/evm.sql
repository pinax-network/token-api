WITH m AS (
    SELECT
        argMax(symbol, block_num) as symbol,
        argMax(name, block_num) as name
    FROM erc20_metadata
    WHERE address = {contract: String}
    GROUP BY address
), d AS (
    SELECT decimals
    FROM erc20_metadata_initialize
    WHERE address = {contract: String}
), s AS (
    SELECT total_supply
    FROM erc20_total_supply_changes
    WHERE contract = {contract: String}
    ORDER BY block_num DESC
    LIMIT 1
), b AS (
    SELECT
        count() as holders,
        sum(balance) as circulating_supply,
        max(block_num) AS block_num,
        max(timestamp) AS timestamp
    FROM (
        SELECT
            address,
            contract,
            max(block_num) AS block_num,
            max(timestamp) AS timestamp,
            argMax(balance, t.block_num) AS balance
        FROM balances_by_contract AS t
        WHERE contract = {contract: String}
        GROUP BY
            contract,
            address
        HAVING balance > 0
    )
)
SELECT
    b.block_num AS block_num,
    b.timestamp AS datetime,
    toUnixTimestamp(b.timestamp) AS timestamp,
    {contract: String} AS contract,
    d.decimals AS decimals,
    trim(m.symbol) AS symbol,
    trim(m.name) AS name,
    b.circulating_supply as circulating_supply,
    s.total_supply / pow(10, d.decimals) as total_supply,
    b.holders as holders,
    {network_id: String} as network_id
FROM b
LEFT JOIN m ON 1 = 1
LEFT JOIN d ON 1 = 1
LEFT JOIN s ON 1 = 1