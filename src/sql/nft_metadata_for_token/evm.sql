WITH erc721 AS (
    SELECT
        token_id,
        'ERC721' AS token_standard,
        contract,
        o.owner AS owner,
        uri,
        'TO IMPLEMENT OFFCHAIN' AS name,
        'TO IMPLEMENT OFFCHAIN' AS description,
        'TO IMPLEMENT OFFCHAIN' AS image,
        [] AS attributes,
        {network_id:String} as network_id
    FROM erc721_metadata_by_token AS t
    FINAL
    JOIN erc721_owners AS o USING (contract, token_id)
    WHERE contract = {contract: String} AND t.token_id = {token_id: UInt256}
),
erc1155 AS (
    SELECT
        token_id,
        'ERC1155' AS token_standard,
        contract,
        o.owner AS owner,
        uri,
        'TO IMPLEMENT OFFCHAIN' AS name,
        'TO IMPLEMENT OFFCHAIN' AS description,
        'TO IMPLEMENT OFFCHAIN' AS image,
        [] AS attributes,
        {network_id:String} as network_id
    FROM erc1155_metadata_by_token AS t
    FINAL
    LEFT JOIN erc1155_balances AS o USING (contract, token_id)
    WHERE contract = {contract: String} AND t.token_id = {token_id: UInt256} AND balance > 0
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
),
filtered_nft_metadata AS (
    SELECT
        contract,
        token_id,
        name,
        description,
        media_uri AS image,
        attributes
    FROM nft_metadata
    WHERE contract = {contract: String} AND token_id = {token_id: UInt256}
)
SELECT
    token_standard,
    contract,
    toString(token_id) AS token_id,
    owner,
    uri,
    if(length(m.name) > 0, m.name, c.name) AS name,
    if(length(m.description) > 0, m.description, c.description) AS description,
    if(length(m.image) > 0, m.image, c.image) AS image,
    if(length(m.attributes) > 0,
        arrayMap(
            trait -> mapUpdate(
                map(
                    'trait_type', JSONExtractString(trait, 'trait_type'),
                    'value', JSONExtractString(trait, 'value')
                ),
                IF(
                    JSONHas(trait, 'display_type'),
                    map('display_type', JSONExtractString(trait, 'display_type')),
                    CAST(map() AS Map(String, String))
                )
            ),
            JSONExtractArrayRaw(m.attributes)
        ),
        c.attributes
    ) AS attributes,
    network_id
FROM combined AS c
LEFT JOIN filtered_nft_metadata AS m USING (contract, token_id)
ORDER BY token_standard