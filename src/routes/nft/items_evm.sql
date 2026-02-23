WITH erc721_current_owners AS (
    SELECT
        contract,
        token_id,
        argMax(owner, global_sequence) AS owner
    FROM {db_nft:Identifier}.erc721_owners
    WHERE contract = {contract: String}
    AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
    GROUP BY contract, token_id
),
erc721_token_metadata AS (
    SELECT
        contract,
        token_id,
        argMax(uri, block_num) AS uri
    FROM {db_nft:Identifier}.erc721_metadata_by_token
    WHERE contract = {contract: String}
    AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
    GROUP BY contract, token_id
),
erc721 AS (
    SELECT
        toString(t.token_id) AS token_id,
        'ERC721' AS token_standard,
        t.contract,
        o.owner AS owner,
        t.uri,
        '' AS name,
        '' AS description,
        '' AS image,
        [] AS attributes
    FROM erc721_token_metadata AS t
    JOIN erc721_current_owners AS o USING (contract, token_id)
),
erc1155_current_balances AS (
    SELECT
        contract,
        token_id,
        owner,
        sum(balance) AS balance
    FROM {db_nft:Identifier}.erc1155_balances
    WHERE contract = {contract: String}
    AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
    GROUP BY contract, token_id, owner
    HAVING balance > 0
),
erc1155_token_metadata AS (
    SELECT
        contract,
        token_id,
        argMax(uri, block_num) AS uri
    FROM {db_nft:Identifier}.erc1155_metadata_by_token
    WHERE contract = {contract: String}
    AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
    GROUP BY contract, token_id
),
erc1155 AS (
    SELECT
        toString(t.token_id) AS token_id,
        'ERC1155' AS token_standard,
        t.contract,
        o.owner AS owner,
        t.uri,
        '' AS name,
        '' AS description,
        '' AS image,
        [] AS attributes
    FROM erc1155_token_metadata AS t
    LEFT JOIN erc1155_current_balances AS o USING (contract, token_id)
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
        argMax(name, created_at) AS name,
        argMax(description, created_at) AS description,
        argMax(media_uri, created_at) AS image,
        argMax(attributes, created_at) AS attributes
    FROM {db_nft:Identifier}.nft_metadata
    WHERE contract = {contract: String}
    AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
    GROUP BY contract, token_id
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
