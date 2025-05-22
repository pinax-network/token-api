WITH erc721 AS (
    SELECT
        toString(token_id) AS token_id,
        'ERC721' AS token_standard,
        contract,
        o.owner AS owner,
        uri,
        'TO IMPLEMENT OFFCHAIN' AS name,
        m.symbol AS symbol,
        'TO IMPLEMENT OFFCHAIN' AS description,
        'TO IMPLEMENT OFFCHAIN' AS image,
        'TO IMPLEMENT OFFCHAIN [{trait_type, value}]' AS attributes,
        {network_id:String} as network_id

    FROM erc721_metadata_by_token AS t
    FINAL
    JOIN erc721_owners AS o USING (contract, token_id)
    LEFT JOIN erc721_metadata_by_contract AS m USING (contract)
    WHERE contract = {contract: String} AND t.token_id = {token_id: UInt256}
),
erc1155_metadata_by_contract AS (
    SELECT DISTINCT
        contract
    FROM erc1155_balances
    FINAL
),
erc1155 AS (
    SELECT
        toString(token_id) AS token_id,
        'ERC1155' AS token_standard,
        contract,
        o.owner AS owner,
        uri,
        'TO IMPLEMENT OFFCHAIN' AS name,
        m.symbol AS symbol,
        'TO IMPLEMENT OFFCHAIN' AS description,
        'TO IMPLEMENT OFFCHAIN' AS image,
        'TO IMPLEMENT OFFCHAIN [{trait_type, value}]' AS attributes,
        {network_id:String} as network_id
    FROM erc1155_metadata_by_token AS t
    FINAL
    LEFT JOIN erc1155_balances AS o USING (contract, token_id)
    LEFT JOIN erc721_metadata_by_contract AS m USING (contract)
    WHERE contract = {contract: String} AND t.token_id = {token_id: UInt256} AND balance > 0
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
)
SELECT * FROM combined