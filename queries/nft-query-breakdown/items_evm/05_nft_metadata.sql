-- items_evm: CTE filtered_nft_metadata
-- Deduplicates nft_metadata using argMax (replaces FINAL)
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
