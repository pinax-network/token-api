-- items_evm: CTE erc1155_current_balances
-- Aggregates erc1155_balances using sum (replaces FINAL)
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
