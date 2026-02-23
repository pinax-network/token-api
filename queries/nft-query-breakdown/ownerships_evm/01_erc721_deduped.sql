-- ownerships_evm: CTE erc721_deduped
-- argMax dedup filtered by owner address (replaces FINAL)
SELECT
    contract,
    token_id,
    argMax(owner, global_sequence) AS owner
FROM {db_nft:Identifier}.erc721_owners
WHERE (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
GROUP BY contract, token_id
HAVING owner IN {address:Array(String)}
