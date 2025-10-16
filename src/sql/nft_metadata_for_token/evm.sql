WITH erc721 AS (
    SELECT
        toString(token_id) AS token_id,
        'ERC721' AS token_standard,
        contract,
        o.owner AS owner,
        uri,
        '' AS name,
        '' AS description,
        '' AS image,
        [] AS attributes
    FROM erc721_metadata_by_token AS t
    FINAL
    JOIN erc721_owners AS o USING (contract, token_id)
    WHERE contract = {contract: String} 
    AND ({token_id:Array(String)} = [''] OR token_id IN {token_id:Array(String)})
),
erc1155 AS (
    SELECT
        toString(token_id) AS token_id,
        'ERC1155' AS token_standard,
        contract,
        o.owner AS owner,
        uri,
        '' AS name,
        '' AS description,
        '' AS image,
        [] AS attributes
    FROM erc1155_metadata_by_token AS t
    FINAL
    LEFT JOIN erc1155_balances AS o USING (contract, token_id)
    WHERE contract = {contract: String}
    AND ({token_id:Array(String)} = [''] OR token_id IN {token_id:Array(String)})
    AND balance > 0
),
combined AS (
    SELECT * FROM erc721
    UNION ALL
    SELECT * FROM erc1155
),
filtered_nft_metadata AS (
    SELECT
        contract,
        toString(token_id) AS token_id,
        name,
        description,
        media_uri AS image,
        attributes
    FROM nft_metadata
    WHERE contract = {contract: String}
    AND ({token_id:Array(String)} = [''] OR token_id IN {token_id:Array(String)})
)
SELECT
    owner AS address,
    contract,
    token_id,
    token_standard,
    if(length(m.name) > 0, m.name, c.name) AS name,
    if(length(m.description) > 0, m.description, c.description) AS description,
    if(length(m.image) > 0, m.image, c.image) AS image,
    uri,
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
    {network:String} as network
FROM combined AS c
LEFT JOIN filtered_nft_metadata AS m USING (contract, token_id)
ORDER BY token_standard, contract, token_id
LIMIT {limit:UInt64}
OFFSET {offset:UInt64}