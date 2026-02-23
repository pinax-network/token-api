-- items_evm: CTE erc721_token_metadata
-- Deduplicates erc721_metadata_by_token using argMax (replaces FINAL)
SELECT
    contract,
    token_id,
    argMax(uri, block_num) AS uri
FROM {db_nft:Identifier}.erc721_metadata_by_token
WHERE contract = {contract: String}
AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
GROUP BY contract, token_id
