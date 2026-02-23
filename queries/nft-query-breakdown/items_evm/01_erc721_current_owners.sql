-- items_evm: CTE erc721_current_owners
-- Deduplicates erc721_owners using argMax (replaces FINAL)
SELECT
    contract,
    token_id,
    argMax(owner, global_sequence) AS owner
FROM {db_nft:Identifier}.erc721_owners
WHERE contract = {contract: String}
AND (empty({token_id:Array(String)}) OR token_id IN {token_id:Array(String)})
GROUP BY contract, token_id
