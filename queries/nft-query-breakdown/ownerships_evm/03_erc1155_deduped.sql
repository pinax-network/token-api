-- ownerships_evm: CTE erc1155_deduped
-- sum aggregation filtered by owner (replaces FINAL)
SELECT
    contract,
    token_id,
    owner,
    sum(balance) AS balance
FROM {db_nft:Identifier}.erc1155_balances
WHERE owner IN {address:Array(String)}
AND (empty({contract:Array(String)}) OR contract IN {contract:Array(String)})
GROUP BY contract, token_id, owner
HAVING balance > 0
