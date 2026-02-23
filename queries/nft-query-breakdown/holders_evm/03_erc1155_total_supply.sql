-- holders_evm: ERC1155 total supply subquery
-- sum aggregation for balances (replaces FINAL)
SELECT sum(balance) AS supply
FROM (
    SELECT contract, token_id, owner, sum(balance) AS balance
    FROM {db_nft:Identifier}.erc1155_balances
    WHERE contract = {contract:String}
    GROUP BY contract, token_id, owner
    HAVING balance > 0
)
