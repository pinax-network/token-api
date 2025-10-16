WITH erc721 AS (
    WITH (
        SELECT count()
        FROM erc721_owners FINAL
        WHERE contract = {contract:String}
    ) AS total_supply
    SELECT
        {contract:String} AS contract,
        'ERC721' AS token_standard,
        owner AS address,
        count() AS quantity,
        uniq(token_id) AS unique_tokens,
        100 * quantity / total_supply AS percentage,
        {network:String} AS network
    FROM erc721_owners AS o FINAL
    WHERE o.contract = {contract:String}
    GROUP BY owner
),
erc1155 AS (
    WITH (
        SELECT sum(balance) AS supply
        FROM erc1155_balances FINAL
        WHERE contract = {contract:String}
    ) AS total_supply
    SELECT
        {contract:String} AS contract,
        'ERC1155' AS token_standard,
        owner,
        sum(balance) AS quantity,
        uniq(token_id) AS unique_tokens,
        100 * quantity / total_supply AS percentage,
        {network:String} AS network
    FROM erc1155_balances AS b FINAL
    WHERE b.contract = {contract:String}
    GROUP BY owner
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
)
SELECT *
FROM combined
ORDER BY percentage DESC
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}