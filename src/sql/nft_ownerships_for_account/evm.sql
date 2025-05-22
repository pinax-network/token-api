WITH erc721 AS (
    SELECT DISTINCT
        o.token_id,
        o.token_standard,
        o.contract,
        o.owner AS owner,
        m.symbol,
        m.name,
        {network_id:String} as network_id
    FROM (
        SELECT
            token_id,
            'ERC721' AS token_standard,
            contract,
            owner,
        FROM erc721_owners
        WHERE owner = {address: String}
    ) AS o
    LEFT JOIN erc721_metadata_by_contract AS m USING (contract)
),
erc1155 AS (
    SELECT DISTINCT
        o.token_id,
        o.token_standard,
        o.contract,
        o.owner AS owner,
        m.symbol,
        m.name,
        {network_id:String} as network_id
    FROM (
        SELECT
            token_id,
            'ERC1155' AS token_standard,
            contract,
            owner,
        FROM erc1155_balances
        WHERE owner = {address: String} AND balance > 0
    ) AS o
    LEFT JOIN erc1155_metadata_by_contract AS m USING (contract)
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
)
SELECT * FROM combined
ORDER BY token_standard, contract, token_id
LIMIT {limit:int}
OFFSET {offset:int}