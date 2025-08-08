WITH erc721 AS (
    WITH (
        SELECT count()
        FROM erc721_owners FINAL
        WHERE contract = { contract: String }
    ) AS total_supply
    SELECT
        'ERC721' AS token_standard,
        owner as address,
        count() AS quantity,
        uniq(token_id) AS unique_tokens,
        quantity / total_supply AS percentage,
        { network_id :String } as network_id
    FROM erc721_owners FINAL
    WHERE contract = { contract: String }
    GROUP BY owner
    ORDER BY count() DESC
),
erc1155 AS (
    WITH (
        SELECT sum(balance) as supply
        FROM erc1155_balances FINAL
        WHERE contract = { contract: String } AND balance > 0
    ) AS total_supply
    SELECT
        'ERC1155' AS token_standard,
        owner,
        sum(balance) AS quantity,
        uniq(token_id) AS unique_tokens,
        quantity / total_supply AS percentage,
        { network_id :String } as network_id
    FROM erc1155_balances FINAL
    WHERE contract = { contract: String } AND balance > 0
    GROUP BY owner
    ORDER BY quantity DESC
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
)
SELECT *
FROM combined
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}